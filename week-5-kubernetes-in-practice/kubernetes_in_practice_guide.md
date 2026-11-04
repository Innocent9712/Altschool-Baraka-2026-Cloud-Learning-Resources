# Kubernetes in Practice

## From Essentials to Practice

Last week we ran a stateless web page: a Deployment, a Service, and a NodePort to reach it. Real applications need
more:

- **Configuration and passwords** that change per environment, without rebuilding the image
- **A database whose data survives** Pods being replaced
- **A proper way in from outside**: one address, with routing to several Services
- **Health checks**, so traffic only goes to Pods that can serve it
- **Fair sharing of nodes**, and **scaling with load**
- **Permissions**, so each person and program can only do what it needs

This week covers the Kubernetes objects for each of these, and puts them together to deploy a full-stack app:
a React frontend, a FastAPI backend, PostgreSQL and Redis.

### From Docker Compose to Kubernetes

If you know Compose (Week 3), most of this week maps onto ideas you already have:

| In `compose.yaml` | In Kubernetes |
|---|---|
| A `service:` entry | A **Deployment** (or StatefulSet) for the containers, plus a **Service** for its network name |
| `environment:` / `env_file:` | A **ConfigMap**, and a **Secret** for sensitive values |
| A named volume | A **PersistentVolumeClaim** |
| `ports: "8080:80"` | A Service of type **LoadBalancer** or NodePort, or an **Ingress** |
| `healthcheck:` | **Probes**: liveness, readiness, startup |
| `depends_on:` | No direct equivalent. Apps retry until their dependencies are ready, and readiness probes hold traffic back meanwhile |
| `deploy.resources` | **Requests and limits** |
| One project | A **Namespace** |

---

## Namespaces

A **namespace** is a named group of objects inside a cluster. Every cluster starts with a few:

| Namespace | Contains |
|---|---|
| `default` | Objects created without a namespace (what we used in Week 4) |
| `kube-system` | Kubernetes' own components: DNS, kube-proxy, and on kind the control plane |
| `kube-public`, `kube-node-lease` | Cluster housekeeping. You rarely touch these |

Teams typically use one namespace per app, per team, or per environment (`shop-dev`, `shop-prod`). What namespaces
give you:

- **Unique names per namespace**: two teams can each have a Service called `backend`.
- **A unit for permissions** (RBAC Roles are per namespace) and for **resource quotas** (a ResourceQuota caps the
  total CPU, memory or object count in a namespace).
- **DNS**: a Service is reachable as `<service>` from its own namespace, and as `<service>.<namespace>` (fully:
  `<service>.<namespace>.svc.cluster.local`) from any other.

```bash
kubectl create namespace demo-app
kubectl get pods -n demo-app                     # one command in a namespace
kubectl get pods -A                              # all namespaces
kubectl config set-context --current --namespace=demo-app   # make it the default for this context
```

What namespaces are **not**: a security boundary on their own. By default, Pods in different namespaces can still talk
to each other over the network (a **NetworkPolicy** can restrict that), and some objects, such as nodes,
PersistentVolumes and StorageClasses, belong to no namespace at all.

---

## Configuration: ConfigMaps and Secrets

A container image should be the **same in every environment**. What changes between development, staging and
production (database host, feature flags, log level, passwords) is supplied from outside, as environment variables or
files. That's the *config* factor of the [Twelve-Factor App](https://12factor.net/config).

### ConfigMap

Non-sensitive key-value configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DB_HOST: postgres
  DB_PORT: "5432"            # values are always strings: quote numbers and booleans
  nginx.conf: |              # a value can also be a whole file
    server { listen 8080; }
```

```bash
kubectl create configmap app-config --from-literal=DB_HOST=postgres --from-file=nginx.conf
```

### Secret

The same idea for sensitive values: passwords, API keys, TLS certificates.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:                  # plain text here. Kubernetes stores it base64-encoded under `data:`
  POSTGRES_USER: appuser
  POSTGRES_PASSWORD: change-me
```

```bash
kubectl create secret generic db-credentials \
  --from-literal=POSTGRES_USER=appuser --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)"
```

Common Secret types:

| Type | Used for |
|---|---|
| `Opaque` (`kubectl create secret generic`) | Anything: passwords, API keys |
| `kubernetes.io/dockerconfigjson` (`kubectl create secret docker-registry`) | Credentials to pull images from a private registry |
| `kubernetes.io/tls` (`kubectl create secret tls`) | A TLS certificate and key, e.g. for HTTPS on an Ingress |
| `kubernetes.io/service-account-token` | API tokens for ServiceAccounts (mostly created automatically) |

**What a Secret does and doesn't protect.** Secret values are **base64-encoded, which is not encryption**:
`base64 -d` reverses it. What makes Secrets safer than ConfigMaps:

- RBAC can allow someone to read ConfigMaps but not Secrets.
- The cluster can **encrypt Secrets at rest** in etcd. Managed services like EKS do this by default.
- They're kept out of `kubectl describe` output, and only sent to nodes that run a Pod using them.

**Never commit real Secret values to Git.** Create them with `kubectl` (as in the demo), or keep them in a secret
manager (AWS Secrets Manager, HashiCorp Vault) and sync them into the cluster with a tool such as the
[External Secrets Operator](https://external-secrets.io/). If they must live in Git, encrypt them first
([Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets), [SOPS](https://github.com/getsops/sops)).

### Using Them in a Pod

```yaml
spec:
  containers:
    - name: backend
      image: demo-backend:v1
      # 1. Every key becomes an environment variable
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: db-credentials
      # 2. Pick individual keys, optionally renaming them
      env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: POSTGRES_PASSWORD
      # 3. Mount as files: each key becomes a file in the folder
      volumeMounts:
        - name: config
          mountPath: /etc/app
  volumes:
    - name: config
      configMap:
        name: app-config
```

**Changing a ConfigMap or Secret doesn't restart anything.** Environment variables are read once, when the
container starts, so you need `kubectl rollout restart deployment/<name>`. Mounted files are updated in the running
Pod after a short delay, but the app has to notice and reload them.

### Private Registries: Image Pull Secrets

If an image is in a private repository, the kubelet needs credentials to pull it:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ --docker-username=<you> --docker-password=<access-token>
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: backend
      image: <you>/demo-backend:v1
```

Or attach it to the namespace's `default` ServiceAccount, so every Pod using it gets it automatically. On AWS, nodes
can pull from **Amazon ECR** using their IAM role, without a pull Secret.

---

## Services in Depth

A Service gives a set of Pods (chosen by **label selector**) one stable name and virtual IP, and spreads traffic
across the ones that are **ready**.

### Ports

```yaml
ports:
  - port: 80           # the Service's own port: clients connect to frontend:80
    targetPort: 8080   # the container's port the traffic is forwarded to
    nodePort: 30080    # NodePort/LoadBalancer only: the port opened on every node
```

### Service Types

| Type | Reachable from | Typical use |
|---|---|---|
| **ClusterIP** (default) | Inside the cluster only | Internal services: APIs, databases, caches |
| **NodePort** | Every node's IP, on a port in 30000-32767 | Learning, or behind your own external load balancer |
| **LoadBalancer** | An external address from the cloud provider | Exposing one Service directly (often TCP, non-HTTP) |
| **ExternalName** | Inside the cluster | A DNS alias to something outside, e.g. `db.example.com` |

Each type builds on the previous one: a LoadBalancer Service is also a NodePort and a ClusterIP Service.

Two special cases:

- **Headless Service** (`clusterIP: None`): no virtual IP. The DNS name resolves straight to the Pod IPs. Used by
  StatefulSets, so each Pod gets its own name (`postgres-0.postgres`).
- **`kubectl port-forward service/<name> 8080:80`** isn't a Service type: it's a temporary tunnel from your machine for
  debugging. Nothing else can use it, and it stops when you press Ctrl+C.

### How Traffic Finds the Pods

The Service controller keeps **EndpointSlices** listing the IPs of the matching Pods, and whether each one is ready.
`kube-proxy` on every node turns that list into networking rules. When a Service "doesn't work", check the endpoints:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=backend
```

No endpoints means the selector doesn't match the Pods' labels. Endpoints that aren't ready means the Pods' readiness
probes are failing.

---

## Ingress and the Gateway API

A LoadBalancer Service gives **one Service** an external address. A real app usually has several Services behind
one domain (`/` for the website, `/api` for the API, `admin.example.com` for the admin site). In the cloud, a load
balancer per Service also costs money for each one.

An **Ingress** is one entry point for HTTP(S) traffic, with rules that route requests to Services by **host** and
**path**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: cloud-provider-kind     # which controller implements this Ingress
  tls:                                      # optional: HTTPS, with a certificate stored in a tls Secret
    - hosts: [shop.example.com]
      secretName: shop-tls
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix                # /api, /api/users ... (Exact would match /api only)
            backend:
              service: { name: backend, port: { number: 8000 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: frontend, port: { number: 80 } }
```

### Ingress Objects vs Ingress Controllers

The **Ingress object** is only a set of rules. Nothing happens until an **Ingress controller**, a program running in
or alongside the cluster, reads the rules and routes the traffic. Kubernetes doesn't include one: you choose and
install it, and `ingressClassName` says which one handles each Ingress (`kubectl get ingressclass`).

| Where | Ingress controller |
|---|---|
| kind (this week's demo) | cloud-provider-kind |
| Amazon EKS | AWS Load Balancer Controller (built into EKS Auto Mode): an Application Load Balancer per Ingress |
| Anywhere | Traefik, HAProxy Ingress, Kong, F5 NGINX Ingress Controller, Envoy Gateway, Cilium, ... |

> **ingress-nginx is retired.** For years the default choice was the community **ingress-nginx** controller, and
> many tutorials and existing clusters still use it. It was retired in March 2026: no more releases or security
> fixes. The **Ingress API itself is not deprecated**. Existing Ingress objects work with any maintained controller,
> and new work increasingly uses the Gateway API.

### The Gateway API

The [Gateway API](https://gateway-api.sigs.k8s.io/) is the newer, official successor to Ingress. It splits the job
into objects owned by different roles:

| Object | Describes | Usually owned by |
|---|---|---|
| **GatewayClass** | A kind of load balancer (which controller) | The cluster or cloud provider |
| **Gateway** | One entry point: its listeners (ports, protocols, certificates) | The platform team |
| **HTTPRoute** (also GRPCRoute, TLSRoute...) | One app's routing rules, attached to a Gateway | The app team |

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
spec:
  parentRefs:
    - name: main-gateway
  rules:
    - matches:
        - path: { type: PathPrefix, value: /api }
      backendRefs:
        - name: backend
          port: 8000
```

What it adds over Ingress: header- and method-based matching, traffic splitting by weight (useful for canary
releases), URL rewrites, and protocols beyond HTTP, all in the standard API rather than controller-specific
annotations. See the demo's `extras/gateway-api.yaml` for the full example.

---

## Storage

A container's filesystem is thrown away when the container is replaced. Kubernetes **volumes** attach storage to a Pod:

| Volume type | Lifetime | Used for |
|---|---|---|
| `emptyDir` | The Pod's lifetime | Scratch space, or sharing files between containers in one Pod |
| `configMap`, `secret` | Follows the ConfigMap or Secret | Config files and credentials as files |
| `persistentVolumeClaim` | Independent of any Pod | Data that must survive: databases, uploads |

### PersistentVolumes, Claims and StorageClasses

- A **PersistentVolume (PV)** is a piece of storage: an EBS volume, a network file share, a folder on a node.
- A **PersistentVolumeClaim (PVC)** is a request for storage: "1Gi, mountable by one node". Pods mount PVCs, not PVs.
- A **StorageClass** describes a *kind* of storage (e.g. AWS `gp3` SSD) and knows how to create it. With a
  StorageClass, a PVC gets a matching PV **created automatically** (dynamic provisioning), so nobody has to create
  PVs by hand.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: standard     # omit to use the cluster's default StorageClass
  resources:
    requests:
      storage: 5Gi
```

**Access modes**: `ReadWriteOnce` (one node at a time: typical block storage such as EBS), `ReadWriteMany` (many
nodes at once: network file systems such as EFS), `ReadOnlyMany`, and `ReadWriteOncePod`.

**Reclaim policy**: what happens to the volume when its PVC is deleted. Dynamically created volumes default to
`Delete` (the data is gone). `Retain` keeps the volume for manual recovery.

### StatefulSets

A Deployment treats its Pods as interchangeable: random names, all sharing one PVC if you give them one. Databases
and other stateful apps need more, which is what a **StatefulSet** provides:

- **Stable names**: `postgres-0`, `postgres-1`... A replacement Pod gets the same name.
- **Stable storage**: `volumeClaimTemplates` creates **one PVC per Pod** (`data-postgres-0`), and a replacement Pod
  reattaches its own PVC.
- **Ordered start-up and shutdown**: `-0` before `-1`, which clustered databases often rely on.
- **Stable DNS** through a headless Service: `postgres-0.postgres.demo-app.svc.cluster.local`.

Deleting a StatefulSet **doesn't** delete its PVCs, to protect the data; deleting the namespace does.

Running a database in Kubernetes is entirely possible, but a managed service (Amazon RDS, Cloud SQL) takes backups,
upgrades and failover off your hands. Many teams keep only stateless apps in the cluster.

---

## Health Checks: Probes

The kubelet can check each container in three ways. Each **probe** is an HTTP request (`httpGet`), a TCP connection
(`tcpSocket`), a command run in the container (`exec`) or a gRPC health check (`grpc`).

| Probe | Question | When it fails |
|---|---|---|
| **Readiness** | "Can you handle requests right now?" | The Pod is removed from Service endpoints. **Not restarted** |
| **Liveness** | "Are you alive, or stuck?" | The container is **restarted** |
| **Startup** | "Have you finished starting?" | Liveness and readiness checks wait until it passes. Restarted if it never does |

```yaml
readinessProbe:
  httpGet: { path: /api/ready, port: 8000 }
  periodSeconds: 5          # check every 5 seconds
  failureThreshold: 2       # 2 failures in a row = not ready
livenessProbe:
  httpGet: { path: /api/health, port: 8000 }
  initialDelaySeconds: 10   # wait before the first check
  periodSeconds: 10
  failureThreshold: 3
```

Guidelines:

- **Readiness can check dependencies** (the database), because the right reaction to "database down" is to stop
  sending traffic, not to restart.
- **Liveness should only check the process itself.** If liveness checked the database, a database outage would
  restart every backend Pod over and over, making things worse.
- Use a **startup probe** for slow-starting apps, instead of a long `initialDelaySeconds` on liveness.
- Without a readiness probe, a Pod gets traffic as soon as its container starts, often before the app is listening.

---

## Resources: Requests and Limits

```yaml
resources:
  requests:
    cpu: 100m        # 100 millicores = 0.1 CPU core
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

- **Requests** are what the **scheduler** reserves. A Pod is only placed on a node with enough unreserved CPU and
  memory for its requests. If no node has room, the Pod stays `Pending`.
- **Limits** are the most the container can use:
  - Over the **CPU** limit, the container is **throttled** (slowed down).
  - Over the **memory** limit, it's **killed** (`OOMKilled`) and restarted.

Based on these, each Pod gets a **QoS class**, which decides who is evicted first when a node runs out of memory:

| QoS class | When | Evicted |
|---|---|---|
| `Guaranteed` | Requests equal limits, for CPU and memory, in every container | Last |
| `Burstable` | Some requests or limits set | In between |
| `BestEffort` | No requests or limits at all | First |

Practical advice: **always set requests** (the scheduler and autoscaler depend on them), and **always set a memory
limit**. CPU limits are debated: they can throttle an app even when the node has CPU to spare, so some teams set CPU
requests only. Namespace-wide defaults and caps come from **LimitRange** and **ResourceQuota** objects.

---

## Autoscaling

| What scales | Tool | How |
|---|---|---|
| Number of Pods | **HorizontalPodAutoscaler (HPA)** | Adds or removes replicas to hit a target metric |
| Size of each Pod | Vertical Pod Autoscaler (VPA) | Adjusts requests and limits from observed usage |
| Number of nodes | Cluster Autoscaler, Karpenter, EKS Auto Mode | Adds nodes when Pods are `Pending` for lack of room; removes idle ones |

The HPA is the one you'll use most:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: backend }
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 50 }   # % of the CPU *request*
```

```bash
kubectl autoscale deployment backend --cpu-percent=50 --min=2 --max=6   # the imperative equivalent
kubectl get hpa
```

- It needs **metrics-server** (or another metrics source) installed, and **CPU requests** on the Pods.
- Roughly: `desired replicas = ceil(current replicas × current usage ÷ target)`. Two Pods at 150% of a 50% target
  become 6.
- Scaling up is fast. Scaling down waits for a **stabilization window** (5 minutes by default) to avoid flapping.
- HPA and node autoscaling work together: the HPA adds Pods, and if they don't fit, the node autoscaler adds nodes.

---

## RBAC: Role-Based Access Control

Every request to the API server comes from an identity, and RBAC decides whether that identity may perform that
**verb** (`get`, `list`, `watch`, `create`, `update`, `patch`, `delete`) on that **resource**.

| Object | Defines | Scope |
|---|---|---|
| **Role** | A set of permissions | One namespace |
| **ClusterRole** | A set of permissions | Cluster-wide, or reusable in any namespace |
| **RoleBinding** | Gives a Role (or ClusterRole) to subjects | One namespace |
| **ClusterRoleBinding** | Gives a ClusterRole to subjects | The whole cluster |

**Subjects** are users and groups (people, usually from an identity provider such as AWS IAM), and
**ServiceAccounts** (identities for programs: Pods, CI pipelines, controllers). Every Pod runs as a ServiceAccount:
`default` unless `serviceAccountName` says otherwise.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: demo-app }
rules:
  - apiGroups: [""]                       # "" = core API group (pods, services, secrets...)
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: viewer-reads-pods, namespace: demo-app }
subjects:
  - { kind: ServiceAccount, name: viewer, namespace: demo-app }
roleRef: { kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io }
```

```bash
kubectl auth can-i delete pods -n demo-app --as=system:serviceaccount:demo-app:viewer   # test someone's permissions
kubectl auth can-i --list -n demo-app                                                   # everything YOU can do
```

Kubernetes ships ready-made ClusterRoles (`view`, `edit`, `admin`, `cluster-admin`) you can bind instead of writing
your own. The rule is **least privilege**: a deployment pipeline needs to update Deployments in its namespace, not
read every Secret in the cluster.

---

## Running Kubernetes in the Cloud: Amazon EKS

With a managed service, the provider runs the **control plane** (API server, etcd, scheduler, controllers): highly
available, backed up and upgraded for you. You choose how the **worker nodes** are run:

| EKS option | Who manages the nodes |
|---|---|
| Managed node groups | You choose instance types and sizes. AWS creates and updates the EC2 instances |
| Fargate | No nodes to see: each Pod runs on its own AWS-managed micro-VM |
| **Auto Mode** | AWS picks, launches, patches and removes nodes as Pods need them, and also runs the storage and load-balancer controllers |

Things that work differently from kind:

- **Images come from a registry** (Docker Hub, or Amazon ECR), not `kind load`, and must match the nodes' CPU
  architecture (`amd64` or `arm64`), so build for both.
- **Credentials**: `aws eks update-kubeconfig` adds the cluster to your kubeconfig, and AWS IAM decides who you are.
- **Storage**: PVCs become EBS volumes, which live in **one availability zone**. A Pod using one can only run there.
- **Load balancers cost money**: each LoadBalancer Service and each Ingress (by default) is a separate AWS load
  balancer.

The [eks/](./eks/README.md) folder creates an EKS cluster with Terraform and deploys this week's app to it.

---

## Troubleshooting in Practice

| Symptom | Likely cause | Look at |
|---|---|---|
| `Pending` | No node has room for the requests, or a PVC can't be bound | `kubectl describe pod` Events, `kubectl get pvc` |
| `CreateContainerConfigError` | A referenced ConfigMap, Secret or key doesn't exist | `kubectl describe pod`: it names the missing object |
| `ErrImagePull` / `ImagePullBackOff` | Wrong image name or tag, private image without a pull Secret, wrong CPU architecture | `kubectl describe pod` Events |
| `CrashLoopBackOff` | The app exits on start: bad config, can't reach a dependency | `kubectl logs <pod>`, `kubectl logs <pod> --previous` |
| `OOMKilled` (in `describe`), restarts | Memory limit too low, or a memory leak | `kubectl describe pod` (Last State), `kubectl top pod` |
| `Running` but `0/1` READY | Readiness probe failing | `kubectl describe pod` Events, the app's logs |
| Restarts keep increasing | Liveness probe failing, or the app crashing | `kubectl describe pod`, `kubectl logs --previous` |
| Service has no endpoints | Selector doesn't match Pod labels, or no Pod is ready | `kubectl get endpointslices -l kubernetes.io/service-name=<svc>`, `kubectl get pods --show-labels` |
| Ingress returns `404` | No rule matches the host or path | `kubectl describe ingress` |
| Ingress returns `502`/`503` | The backing Service has no ready Pods, or the port is wrong | The Service's endpoints and the Pods' readiness |
| HPA shows `<unknown>` | metrics-server missing, or no CPU requests on the Pods | `kubectl top pods`, the Deployment's `resources` |
| `Forbidden` from kubectl | RBAC: your identity lacks that permission | `kubectl auth can-i <verb> <resource>` |

Two habits that solve most problems: **read the Events at the bottom of `kubectl describe`**, and **read the logs,
including `--previous`** for a container that already restarted. `kubectl get events --sort-by=.lastTimestamp` shows
everything that happened recently in a namespace.

---

## Summary

- **Namespaces** group an app's objects and scope names, permissions and quotas.
- **ConfigMaps** and **Secrets** keep configuration out of images. Secrets are only base64-encoded: protect them with
  RBAC and encryption, and never commit them.
- **Service types** decide reachability: ClusterIP inside, LoadBalancer for one Service outside, and an **Ingress**
  (or the **Gateway API**) as one HTTP entry point that routes to many Services.
- **PVCs** request storage, **StorageClasses** create it, and **StatefulSets** give stateful Pods stable names and
  their own volumes.
- **Readiness** probes control traffic, **liveness** probes trigger restarts.
- **Requests** drive scheduling and autoscaling, **limits** cap usage.
- The **HPA** scales Pods with load. **RBAC** gives each identity only what it needs.

## Check Your Understanding

1. You change a value in a ConfigMap that the backend reads through `envFrom`. Nothing changes in the running app. Why, and what do you run?
2. A colleague says "it's fine to commit the Secret YAML, the password is encrypted". What's wrong with that, and what should the team do instead?
3. Postgres runs as a Deployment with one PVC. You scale it to 2 replicas. What could go wrong, and what would a StatefulSet do differently?
4. Your backend's liveness probe calls an endpoint that checks the database. The database restarts for 2 minutes. What happens to the backend, and how would you fix the probes?
5. Your app has a frontend, an API and an admin site. Why use one Ingress instead of three LoadBalancer Services?
6. A Pod has been `Pending` for 10 minutes. Name two causes and the command that tells you which it is.
7. An HPA shows `cpu: <unknown>/50%`. Give two reasons.
8. Your CI pipeline needs to update the image of Deployments in the `shop` namespace. Which RBAC objects would you create, and what verbs and resources would the Role allow?

## Further Learning

- [Kubernetes documentation: ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) and [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes documentation: Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Gateway API documentation](https://gateway-api.sigs.k8s.io/)
- [Kubernetes documentation: Storage](https://kubernetes.io/docs/concepts/storage/)
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [cloud-provider-kind](https://github.com/kubernetes-sigs/cloud-provider-kind)
- [Amazon EKS Auto Mode](https://docs.aws.amazon.com/eks/latest/userguide/automode.html)
