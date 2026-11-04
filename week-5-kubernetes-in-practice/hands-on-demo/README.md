# Kubernetes Hands-On Demo: Deploying a Full-Stack App

In Week 4 we ran one small web page. This week we deploy a real application, the same shape as most apps you'll meet
at work:

```
                        ┌─────────────── namespace: demo-app ───────────────┐
                        │                                                   │
 browser ──► Ingress ───┼──  /api/*  ──► backend  (FastAPI, 2+ Pods) ──┬──► postgres (StatefulSet + volume)
                        │                                              └──► redis    (cache)
                        │                                                   │
                        └──  /*      ──► frontend (React + nginx, 2 Pods)   │
                        └───────────────────────────────────────────────────┘
```

On the way we use the objects that turn "it runs" into "it runs properly":

1. A cluster with a cloud-style load balancer and Ingress
2. Images for the app
3. **Namespaces**: a home for the app
4. **ConfigMaps and Secrets**: configuration outside the image
5. **StatefulSets, PersistentVolumeClaims**: storage that outlives Pods
6. **Probes, requests and limits**: the backend
7. **Service types**: ClusterIP, port-forward, LoadBalancer
8. **Ingress**: one address for the whole app
9. Readiness and persistence in action
10. **HorizontalPodAutoscaler**: scaling on CPU load
11. **RBAC**: who can do what
12. Cleanup

As in previous weeks, ask the class to **predict** what will happen before running each command.

## Prerequisites

Everything from Week 4 (Docker, `kubectl`, `kind`), and nothing else: **cloud-provider-kind** runs as a container.

**Build the two images before class** (Step 2). The frontend build downloads its npm packages, so it's the slowest part.

> **Other kind clusters on your machine?** cloud-provider-kind works with every kind cluster it finds. It will also
> give LoadBalancer Services and Ingresses in those clusters a working address.

## Files

| Path | Purpose |
|---|---|
| `kind-config.yaml` | The local cluster: 1 control-plane node and 2 workers |
| `app/backend/` | FastAPI API (users, posts, analytics). Uses PostgreSQL for data and Redis as a cache. Every route is under `/api` |
| `app/frontend/` | React app, built into static files and served by nginx. Calls the API at `/api` on the same address |
| `k8s/00-namespace.yaml` | The `demo-app` namespace |
| `k8s/01-configmap.yaml` | Non-secret settings: database host and name, Redis URL |
| `k8s/02-postgres.yaml` | PostgreSQL: StatefulSet with a 1Gi volume, and a headless Service |
| `k8s/03-redis.yaml` | Redis: Deployment and Service, no volume (it's only a cache) |
| `k8s/04-backend.yaml` | Backend: Deployment with probes, requests and limits, and a ClusterIP Service |
| `k8s/05-frontend.yaml` | Frontend: Deployment and ClusterIP Service |
| `k8s/06-ingress.yaml` | Ingress: `/api` to the backend, everything else to the frontend |
| `k8s/07-hpa.yaml` | HorizontalPodAutoscaler for the backend |
| `k8s/08-rbac.yaml` | A read-only ServiceAccount, Role and RoleBinding |
| `show-urls.sh` | Prints the `localhost` URL for each Ingress and LoadBalancer in the cluster |
| `extras/gateway-api.yaml` | The same routing as the Ingress, using the newer Gateway API |

The database password is **not** in any file. We create the Secret with `kubectl` in Step 4.

All commands are run from this folder.

---

## Step 1: A Cluster That Behaves Like a Cloud

```bash
kind create cluster --name k8s-practice --config kind-config.yaml
kubectl config current-context        # kind-k8s-practice
kubectl get nodes
```

**Ask**: *"In Week 4 we reached our app through a NodePort and a port mapping in `kind-config.yaml`. What happens on
AWS when you ask for a Service of type LoadBalancer?"* The cloud provider creates a real load balancer for you. A
plain kind cluster has no cloud behind it, so we add one: **cloud-provider-kind**, a small program that plays the
role of the cloud provider for kind clusters.

```bash
docker run -d --name cloud-provider-kind --rm --network kind \
  -v /var/run/docker.sock:/var/run/docker.sock \
  registry.k8s.io/cloud-provider-kind/cloud-controller-manager:v0.12.0 \
  --enable-lb-port-mapping
```

It reads Docker to find kind clusters, so it needs the Docker socket. `--enable-lb-port-mapping` publishes every
load balancer it creates on a free port of your machine.

```bash
kubectl get ingressclass,gatewayclass   # an Ingress controller and a Gateway API controller are now available
kubectl get storageclass                # "standard" (default): kind can create volumes on demand
```

**Points**:
- Every cluster provides a few things the app objects rely on: an **Ingress controller** (routes HTTP traffic),
  a **load balancer** integration, and a **StorageClass** (creates disks). On EKS, AWS provides them. Here it's
  cloud-provider-kind and kind's local-path provisioner.
- In a real cluster these are installed once by whoever runs the platform. App teams just use them.

---

## Step 2: Images for the App

```bash
docker build -t demo-backend:v1 app/backend/
docker build -t demo-frontend:v1 app/frontend/
kind load docker-image demo-backend:v1 demo-frontend:v1 --name k8s-practice
```

Open `app/frontend/src/lib/api.ts`: the frontend calls the API at `/api`, on **the same address the page came from**.
No backend URL is baked into the image, so the same image works on a laptop, in staging and in production. We'll
make that work with an Ingress in Step 8.

(Postgres and Redis are public images. The cluster pulls them from Docker Hub when it needs them.)

---

## Step 3: Namespaces

```bash
kubectl get namespaces
kubectl apply -f k8s/00-namespace.yaml
kubectl get namespaces
```

**Points**:
- A namespace groups the objects of one app or team. Names only need to be unique **within** a namespace, so two
  teams can both have a Service called `backend`.
- RBAC permissions (Step 11) and resource quotas are usually set per namespace.
- Every manifest in `k8s/` sets `namespace: demo-app`. To avoid typing `-n demo-app` on every command, make it this
  context's default:

```bash
kubectl config set-context --current --namespace=demo-app
kubectl get pods                      # "No resources found in demo-app namespace."
```

---

## Step 4: ConfigMaps and Secrets

**Ask**: *"In Week 3, the database password was in `.env` and `compose.yaml`. Where should it live in Kubernetes?"*

Open `k8s/01-configmap.yaml`: the database host, port and name, and the Redis URL. Nothing secret.

```bash
kubectl apply -f k8s/01-configmap.yaml
kubectl describe configmap app-config
```

Now the Secret. We create it with `kubectl`, so the password never goes into a file in Git:

```bash
kubectl create secret generic db-credentials \
  --from-literal=POSTGRES_USER=appuser \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)"

kubectl get secret db-credentials -o yaml          # the values are base64-encoded...
kubectl get secret db-credentials -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d; echo   # ...not encrypted
```

**Points**:
- **base64 is an encoding, not encryption.** Anyone who can read the Secret can read the password. What protects a
  Secret is who is *allowed* to read it (RBAC, Step 11), and encryption of etcd on the server side.
- The **same** Secret is used by Postgres (to set the password) and by the backend (to log in), so they can't drift apart.
- Teams usually keep the real values in a secret manager (AWS Secrets Manager, Vault) and sync them into the
  cluster with a tool like External Secrets Operator. Not in Git.

---

## Step 5: Storage That Outlives Pods

**Ask**: *"A Pod is deleted and replaced (Week 4). What happens to files the database wrote inside its container?"*
They're gone. A database needs storage that isn't tied to one Pod.

Open `k8s/02-postgres.yaml`:
- It's a **StatefulSet**, not a Deployment: the Pod gets a stable name (`postgres-0`), and its own volume that
  follows it.
- `volumeClaimTemplates` asks for a 1Gi **PersistentVolumeClaim** (PVC). The StorageClass creates a matching
  **PersistentVolume** (PV) automatically.
- `POSTGRES_USER` and `POSTGRES_PASSWORD` come from the Secret, `POSTGRES_DB` from the ConfigMap.

```bash
kubectl apply -f k8s/02-postgres.yaml
kubectl get pods -w                   # wait for postgres-0 to be 1/1 Running, then Ctrl+C
kubectl get pvc,pv                    # the claim (PVC), and the volume created for it (PV): Bound
```

**Points**:
- **PVC** = "I need 1Gi of disk" (written by the app team). **PV** = an actual disk (created by the StorageClass, or
  by an admin). On EKS the same YAML gets an EBS volume.
- The Service is **headless** (`clusterIP: None`): the name `postgres` resolves straight to the Pod's IP.
- Running databases in Kubernetes is possible, but many teams use a managed database (e.g. Amazon RDS) instead and
  keep only stateless apps in the cluster.

---

## Step 6: The Backend: Probes, Requests and Limits

```bash
kubectl apply -f k8s/03-redis.yaml -f k8s/04-backend.yaml
kubectl get pods -w                   # 2 backend Pods: watch READY go from 0/1 to 1/1, then Ctrl+C
```

Open `k8s/04-backend.yaml`:
- `envFrom` turns every key of the ConfigMap and the Secret into an environment variable.
- **Probes**: the kubelet keeps asking each container two questions.
  - **Readiness** (`/api/ready`, which queries the database): *"Should I get traffic?"* If not, the Pod is taken out
    of the Service, but left running. That's why READY started at 0/1.
  - **Liveness** (`/api/health`): *"Are you stuck?"* If not, the container is restarted. It deliberately doesn't
    check the database: restarting the backend wouldn't fix a database problem.
- **Requests and limits**:
  - **Requests** are what the scheduler reserves on a node.
  - **Limits** are the most the container can use. Above the CPU limit it's slowed down; above the memory limit
    it's killed (`OOMKilled`).

```bash
kubectl describe pod -l app=backend | grep -E "Liveness|Readiness|Limits|Requests" -A2
kubectl get endpointslices -l kubernetes.io/service-name=backend   # the 2 ready Pods behind the backend Service
kubectl describe node k8s-practice-worker | grep -A8 "Allocated resources"
```

**Ask**: *"What if a Pod requested more CPU than any node has free?"* It stays **Pending**: the scheduler places
Pods by their requests.

---

## Step 7: Service Types: Reaching the App

```bash
kubectl apply -f k8s/05-frontend.yaml
kubectl get services                  # backend, frontend, postgres, redis: all ClusterIP (or headless)
```

**Ask**: *"Can I open the frontend in my browser now?"* No. **ClusterIP** Services are only reachable from inside
the cluster. That's the right default: Postgres and Redis should never be reachable from outside.

**For yourself, while developing**, `port-forward` tunnels one port from your laptop into the cluster:

```bash
kubectl port-forward service/frontend 8080:80    # open http://localhost:8080, then Ctrl+C
```

The page loads, but the data doesn't: the browser calls `/api` on `localhost:8080`, and this tunnel only reaches the
frontend, whose nginx answers `/api` with 404. Hold that thought.

**For real users**, a Service of type **LoadBalancer** asks the cloud for a load balancer:

```bash
kubectl expose deployment frontend --name=frontend-lb --type=LoadBalancer --port=80 --target-port=8080
kubectl get service frontend-lb       # EXTERNAL-IP: <pending> for a few seconds, then an address
./show-urls.sh                        # the localhost URL for that load balancer
```

**Ask**: *"The app also needs the backend reachable at `/api`. Should we give the backend its own LoadBalancer
too?"* That works, but:
- Every LoadBalancer Service is a separate load balancer, and **in the cloud each one costs money**.
- The frontend and backend would be on **different addresses**, so the frontend would need the backend's address
  baked in at build time, plus CORS settings.

One entry point that routes by path would be better: an **Ingress**.

```bash
kubectl delete service frontend-lb
```

---

## Step 8: Ingress: One Address for the Whole App

Open `k8s/06-ingress.yaml`: `/api` goes to the `backend` Service, everything else goes to the `frontend` Service.
`ingressClassName` picks which Ingress controller handles it.

```bash
kubectl apply -f k8s/06-ingress.yaml
kubectl get ingress                   # ADDRESS appears after a few seconds
./show-urls.sh                        # "Gateway/Ingress demo-app/kind-ingress-gateway ... http://localhost:<port>"
```

Open that URL. Create a user and a post in the UI, then open the **Health** page and refresh it a few times:
**Served by Pod** changes, because the backend Service load-balances across its Pods.

```bash
curl -s http://localhost:<port>/api/health          # replace <port> with yours
```

**Points**:
- The Ingress object is just **routing rules**. The **Ingress controller** is the program that receives the traffic
  and applies them. On EKS it would be an AWS Application Load Balancer, configured from the same YAML.
- One entry point, one address: the page and the API share an origin, so there's nothing to configure in the
  frontend and no CORS.

Peek behind the scenes:

```bash
kubectl get gateway
```

cloud-provider-kind implemented our Ingress by creating a **Gateway**: an object from the **Gateway API**, the newer
successor to Ingress. More in [Going Further](#going-further).

---

## Step 9: Readiness and Persistence in Action

**Ask**: *"The database goes down. What should happen to the backend Pods: restart them, or something else?"*

```bash
kubectl scale statefulset postgres --replicas=0
kubectl get pods -w                   # after a few seconds, backend Pods go to 0/1. RESTARTS stays at 0. Ctrl+C
kubectl describe endpointslices -l kubernetes.io/service-name=backend | grep -E "Addresses|Ready:"   # Ready: false
```

Refresh the app: the page still loads (the frontend is fine), but the data can't be fetched. The Ingress answers
`/api` with `503 Service Unavailable` instead of sending users to Pods that can't serve them.

**Point**: Readiness failed, liveness didn't. Kubernetes stopped sending traffic but didn't restart anything,
because restarting wouldn't help. Now bring the database back:

```bash
kubectl scale statefulset postgres --replicas=1
kubectl get pods -w                   # postgres-0, then the backends, go back to 1/1. Ctrl+C
```

Refresh: **your user and post are still there**. The new `postgres-0` Pod reattached the same PVC. Try it again by
deleting the Pod directly:

```bash
kubectl delete pod postgres-0
kubectl get pods -w                   # the StatefulSet recreates postgres-0 with the same volume. Ctrl+C
kubectl get pvc                       # the same claim, untouched
```

---

## Step 10: Autoscaling on CPU Load

**Ask**: *"In Week 4 we scaled by hand. Can Kubernetes do it from the load?"* Yes, with a
**HorizontalPodAutoscaler** (HPA). It needs CPU measurements, which come from **metrics-server**:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.9.0/components.yaml
# kind's kubelets use self-signed certificates, so tell metrics-server to accept them (local clusters only)
kubectl patch deployment metrics-server -n kube-system --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl rollout status deployment/metrics-server -n kube-system
kubectl top pods                      # may say "metrics not available yet" at first: try again shortly
```

Open `k8s/07-hpa.yaml`: between 2 and 6 backend Pods, aiming at 50% of each Pod's CPU **request** (Step 6).

```bash
kubectl apply -f k8s/07-hpa.yaml
kubectl get hpa                       # TARGETS: cpu: <low>%/50%
```

Generate load from inside the cluster: 4 loops hammering the API.

```bash
kubectl run load --image=busybox:1.37 --restart=Never -- \
  sh -c 'for i in 1 2 3 4; do (while true; do wget -q -O /dev/null http://backend:8000/api/users; done) & done; wait'
kubectl get hpa -w                    # CPU climbs far above 50%, REPLICAS goes up to 6. Ctrl+C
kubectl get pods -l app=backend
```

Stop the load:

```bash
kubectl delete pod load
kubectl get hpa -w                    # CPU drops, but REPLICAS stays at 6 for ~5 minutes before scaling down
```

**Points**:
- Scale-down is deliberately slow, so a short dip in traffic doesn't remove Pods you'll need again a minute later.
- The HPA only works because the backend sets CPU **requests**. Without them it has nothing to compare usage to.
- The HPA now owns `replicas`. Re-applying `04-backend.yaml` would reset it to 2 until the HPA adjusts it again. In
  real setups, remove `replicas` from the Deployment when an HPA manages it.

---

## Step 11: RBAC: Who Can Do What

**Ask**: *"Our CI pipeline (Weeks 6–7) and a monitoring tool will talk to this cluster. Should they be cluster
admins like us?"* No. Give each identity only what it needs.

Open `k8s/08-rbac.yaml`: a **ServiceAccount** (`viewer`), a **Role** that can read Pods and their logs in
`demo-app`, and a **RoleBinding** connecting them.

```bash
kubectl apply -f k8s/08-rbac.yaml
kubectl auth can-i list pods     --as=system:serviceaccount:demo-app:viewer   # yes
kubectl auth can-i get pods/log  --as=system:serviceaccount:demo-app:viewer   # yes
kubectl auth can-i delete pods   --as=system:serviceaccount:demo-app:viewer   # no
kubectl auth can-i get secrets   --as=system:serviceaccount:demo-app:viewer   # no: can't read our password
kubectl auth can-i list pods -n default --as=system:serviceaccount:demo-app:viewer   # no: Roles are per namespace

kubectl get pods    --as=system:serviceaccount:demo-app:viewer   # works
kubectl get secrets --as=system:serviceaccount:demo-app:viewer   # Forbidden
```

**Points**:
- `--as` lets an admin test permissions without logging in as someone else.
- **Role/RoleBinding** apply to one namespace. **ClusterRole/ClusterRoleBinding** apply to the whole cluster (for
  things like nodes, which don't belong to a namespace).
- Pods run as a ServiceAccount too (`default` unless you set `serviceAccountName`), which is how an app in the
  cluster gets permission to call the Kubernetes API.

---

## Step 12: Cleanup

```bash
kubectl delete namespace demo-app     # deletes EVERYTHING in it, including the PVC and the data in it
kubectl config set-context --current --namespace=default
kind delete cluster --name k8s-practice
docker stop cloud-provider-kind       # also removes its load balancer containers
docker image rm demo-backend:v1 demo-frontend:v1
```

---

## Summary to Show the Class

| We needed | Kubernetes object | What it gives you |
|---|---|---|
| A home for the app | Namespace | Grouping, unique names, per-team permissions and quotas |
| Settings outside the image | ConfigMap | Same image, different config per environment |
| A password outside Git | Secret | Separate, access-controlled (but only base64-encoded) |
| A database that keeps its data | StatefulSet + PersistentVolumeClaim | Stable identity and a volume that outlives the Pod |
| Traffic only to working Pods | Readiness probe | Unready Pods are taken out of the Service |
| Restart stuck containers | Liveness probe | Automatic restarts |
| Fair use of nodes | Requests and limits | Scheduling by request, a hard ceiling on use |
| A way in from outside | Service type LoadBalancer | One cloud load balancer per Service |
| One address for the whole app | Ingress (or Gateway API) | Routing by path or hostname to many Services |
| Capacity that follows load | HorizontalPodAutoscaler | More Pods under load, fewer when it's quiet |
| Least privilege | ServiceAccount, Role, RoleBinding | Only the permissions each identity needs |

## Going Further

- **Gateway API**: delete the Ingress and apply `extras/gateway-api.yaml` instead. It describes the same routing as
  two objects: a **Gateway** (the entry point, usually owned by a platform team) and an **HTTPRoute** (one app's
  routes). Run `./show-urls.sh` to find its address.
  ```bash
  kubectl delete -f k8s/06-ingress.yaml
  kubectl apply -f extras/gateway-api.yaml
  ./show-urls.sh                      # "Gateway/Ingress demo-app/demo-gateway ..."
  ```
- **The same app on AWS**: [../eks/README.md](../eks/README.md) creates an EKS cluster with Terraform and deploys
  these manifests to it, with images pulled from a registry.

## Troubleshooting

| Problem | Fix |
|---|---|
| `docker run ... cloud-provider-kind` fails with `network kind not found` | Create the cluster first (Step 1): kind creates the `kind` Docker network |
| `kubectl get ingressclass` shows nothing | cloud-provider-kind isn't running: `docker ps --filter name=cloud-provider-kind`, and `docker logs cloud-provider-kind` |
| `./show-urls.sh` prints nothing for the Ingress | Wait a few seconds after `kubectl apply`, then check `kubectl get ingress` has an ADDRESS |
| A URL that worked stops working | cloud-provider-kind was restarted and the port changed. Run `./show-urls.sh` again |
| Backend or frontend Pods in `ErrImagePull` | The images weren't loaded into the cluster. Run the `kind load docker-image` command from Step 2 |
| `postgres-0` in `CrashLoopBackOff`, logs say `No space left on device` | Docker's disk is full. Check `docker system df` and free space (e.g. `docker builder prune`) |
| `postgres-0` or backend Pods stuck in `CreateContainerConfigError` | The `db-credentials` Secret is missing or in the wrong namespace. Run the command from Step 4 |
| Backend Pods stay `0/1` | Readiness is failing: is `postgres-0` `1/1`? Check `kubectl logs -l app=backend` |
| `kubectl top pods`: `Metrics API not available` | metrics-server is still starting, or the `--kubelet-insecure-tls` patch is missing (Step 10) |
| HPA TARGETS shows `<unknown>` | Same as above: the HPA has no metrics yet |
| The app shows old content after a change | Rebuild the image, `kind load` it again, then `kubectl rollout restart deployment/<name>` |
