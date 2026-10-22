# Kubernetes Hands-On Demo: Pods, Deployments, and Services on a Local Cluster

We run a real, multi-node Kubernetes cluster on a laptop with **kind** ("Kubernetes in Docker") and use it to see the
core ideas in action:

1. A cluster and its nodes
2. Pods: the smallest unit, which nothing recreates
3. Deployments: desired state, so Kubernetes keeps Pods running
4. Self-healing
5. Scaling
6. Services: one stable address, load-balanced across Pods
7. Rolling updates and rollbacks
8. Node maintenance: Kubernetes moves the Pods
9. Cleanup

As in previous weeks, ask the class to **predict** what will happen before running each command.

## Prerequisites

- **Docker** running (kind creates each Kubernetes "node" as a Docker container)
- **kubectl**: [install guide](https://kubernetes.io/docs/tasks/tools/). Check with `kubectl version --client`
- **kind**: [install guide](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) (e.g. `brew install kind`). Check with `kind version`

> **Using a work laptop with other clusters configured?** kind switches your current `kubectl` context to the new
> cluster. Check with `kubectl config current-context` before running anything. It should say `kind-k8s-demo`.

## Files

| File | Purpose |
|---|---|
| `kind-config.yaml` | The local cluster: 1 control-plane node, 2 worker nodes, and port 30080 forwarded to your machine |
| `app/` | A small nginx web page showing **which Pod** served the request, with a version and colour set at build time |
| `01-pod.yaml` | A single Pod |
| `02-deployment.yaml` | A Deployment running 3 replicas of the demo app |
| `03-service.yaml` | A NodePort Service in front of the Deployment's Pods |

All commands below are run from this folder.

---

## Step 1: A Cluster and Its Nodes

```bash
kind create cluster --name k8s-demo --config kind-config.yaml
kubectl config current-context        # kind-k8s-demo
kubectl get nodes
```

**Point**: 3 nodes, 1 control plane, and 2 workers. Each "node" here is a Docker container (`docker ps`). In the cloud, each would be a VM.

**Ask**: *"Where is the control plane? The API server, etcd, the scheduler?"*

```bash
kubectl get pods -n kube-system -o wide
```

**Point**: The control-plane components from the architecture diagram are running right there (`kube-apiserver`, `etcd`, `kube-scheduler`, `kube-controller-manager`), plus `kube-proxy` on every node and `coredns` for in-cluster DNS. `kube-system` is a **namespace**: a way of grouping objects. Our apps go in the `default` namespace.

---

## Step 2: Pods, the Smallest Unit

Open `01-pod.yaml`: `apiVersion`, `kind`, `metadata`, and `spec`, the four parts of every Kubernetes object.

```bash
kubectl apply -f 01-pod.yaml
kubectl get pods -o wide              # which node did the scheduler pick?
kubectl describe pod hello-pod        # read the Events at the bottom: Scheduled → Pulling → Created → Started
kubectl logs hello-pod
kubectl exec -it hello-pod -- sh      # try: nginx -v, then exit
```

**Ask**: *"What happens if I delete it?"*

```bash
kubectl delete pod hello-pod
kubectl get pods                      # gone, and nothing brings it back
```

**Point**: A bare Pod has nobody looking after it. In practice you almost never create Pods directly. You create a **Deployment**, which creates and watches the Pods for you.

---

## Step 3: Deployments and Desired State

First build the demo app's image, in two versions:

```bash
docker build -t demo-web-app:v1 app/
docker build -t demo-web-app:v2 --build-arg VERSION=v2 --build-arg COLOR=#7c3aed app/
```

**Ask**: *"Our cluster's nodes are separate containers. Can they see the images we just built?"* No. Normally the cluster pulls images from a registry (Week 3). For a local kind cluster, we copy them in:

```bash
kind load docker-image demo-web-app:v1 demo-web-app:v2 --name k8s-demo
```

Open `02-deployment.yaml`: `replicas: 3`, the `selector`, and the Pod `template` (the Pod spec from Step 2, now inside a Deployment).

```bash
kubectl apply -f 02-deployment.yaml
kubectl get deployments
kubectl get replicasets
kubectl get pods -o wide              # 3 Pods, spread across the worker nodes
```

**Points**:
- **Deployment → ReplicaSet → Pods.** Pod names are `<deployment>-<replicaset hash>-<random>`.
- The Pods only run on the **worker** nodes. The control-plane node is *tainted*, so ordinary workloads stay off it.
- We said *what* we want (3 replicas of this Pod). We didn't say *where* or *how*. That's the declarative model from Week 1.

---

## Step 4: Self-Healing

**Ask**: *"I delete one of the 3 Pods. What happens this time?"*

```bash
kubectl delete pod <one-of-the-pod-names>
kubectl get pods                      # a new Pod (new name, a few seconds old) has already replaced it
```

**Point**: This is the **reconciliation loop**. The ReplicaSet controller saw that the actual state was 2 and the desired state was 3, and created one. The same thing happens if a container crashes or a node dies.

---

## Step 5: Scaling

```bash
kubectl scale deployment demo-web-app --replicas=5
kubectl get pods -o wide
```

**Point**: `kubectl scale` is quick, but it changes the cluster without changing the YAML file, which is drift (Week 1). The declarative way is to edit `replicas:` in `02-deployment.yaml` and `kubectl apply` again. Do that now: set `replicas: 5` in the file and apply it, so the file and the cluster agree.

(Scaling automatically based on CPU load is covered next week.)

---

## Step 6: Services, One Stable Address

**Ask**: *"We have 5 Pods with 5 different IPs that change whenever a Pod is replaced. How does anything find them?"*

```bash
kubectl get pods -o wide              # note the Pod IPs
```

Open `03-service.yaml`. The `selector: app: demo-web-app` is how the Service finds its Pods: **by label, not by name or IP**.

```bash
kubectl apply -f 03-service.yaml
kubectl get service demo-web-service
kubectl get endpointslices -l kubernetes.io/service-name=demo-web-service   # the Pod IPs behind the Service
```

Open http://localhost:30080. The page shows which Pod served it. Then:

```bash
for i in $(seq 1 10); do curl -s localhost:30080 | grep -o 'demo-web-app-[a-z0-9-]*'; done
```

**Point**: Requests are spread across all the Pods. (A browser tends to reuse one connection, so it may keep showing the same Pod. `curl` opens a new connection each time.)

From **inside** the cluster, Services also get a DNS name:

```bash
kubectl run tmp --rm -it --restart=Never --image=busybox:1.37 -- wget -qO- http://demo-web-service
```

**Points**:
- Inside the cluster, other apps just use `http://demo-web-service`, and the Service routes to whichever Pods currently exist.
- **NodePort** opens a port on every node and is fine for learning. **ClusterIP** (the default) is internal only. **LoadBalancer** gets a cloud load balancer. More on Service types and on exposing apps properly next week.

---

## Step 7: Rolling Updates and Rollbacks

**Ask**: *"I want to ship v2 to users. How do I update 5 Pods without downtime?"*

Edit `02-deployment.yaml`: change `image: demo-web-app:v1` to `image: demo-web-app:v2`. Point out the `strategy` section: `maxSurge: 1` and `maxUnavailable: 0`.

```bash
kubectl apply -f 02-deployment.yaml
kubectl rollout status deployment/demo-web-app
kubectl get replicasets                # the new ReplicaSet has 5 Pods; the old one is scaled to 0 (kept for rollback)
```

Refresh http://localhost:30080: the page is now purple and says v2. (If you run the `curl` loop *during* the rollout, you'll see v1 and v2 answering side by side.)

**Now a bad release.** Change the image to `demo-web-app:v3`, an image that doesn't exist:

```bash
kubectl set image deployment/demo-web-app web=demo-web-app:v3
kubectl get pods                       # one new Pod is stuck in ErrImagePull / ImagePullBackOff
kubectl describe pod <the-failing-pod> # Events: "Back-off pulling image demo-web-app:v3"
curl -s localhost:30080 | grep -o 'Kubernetes (v[0-9])'   # still v2: users are unaffected
```

**Point**: Because `maxUnavailable: 0`, Kubernetes never removed a working Pod while the new one couldn't start. The bad release is stuck instead of taking the site down.

```bash
kubectl rollout history deployment/demo-web-app
kubectl rollout undo deployment/demo-web-app
kubectl rollout status deployment/demo-web-app
kubectl get pods                       # 5 healthy v2 Pods
```

**Point**: `kubectl rollout undo` prints a warning that the live Deployment no longer matches the file you last applied, so you have drift again. `rollout undo` is the emergency brake. The lasting fix is to correct the YAML (`image: demo-web-app:v2`) and `kubectl apply` it, so the file stays the source of truth.

---

## Step 8: Node Maintenance

**Ask**: *"A node needs patching. What happens to the Pods on it?"*

```bash
kubectl get pods -o wide                                   # note which Pods are on k8s-demo-worker
kubectl drain k8s-demo-worker --ignore-daemonsets
kubectl get nodes                                          # k8s-demo-worker: SchedulingDisabled
kubectl get pods -o wide                                   # all Pods now on k8s-demo-worker2, still 5 running
```

**Point**: `drain` evicts the Pods, and the Deployment immediately recreates them on a healthy node. Users never notice. If a node *crashes* instead, Kubernetes does the same thing automatically, after waiting about 5 minutes to make sure the node is really gone.

```bash
kubectl uncordon k8s-demo-worker
kubectl get pods -o wide            # the Pods don't move back on their own; new Pods will use both nodes again
```

---

## Step 9: Cleanup

```bash
kubectl delete -f 03-service.yaml -f 02-deployment.yaml
kind delete cluster --name k8s-demo
docker image rm demo-web-app:v1 demo-web-app:v2
```

---

## Summary to Show the Class

| We did | Kubernetes object | What it gives you |
|---|---|---|
| Ran one container | Pod | The smallest unit. Nothing restarts it if it's deleted |
| Asked for 3, then 5 copies | Deployment → ReplicaSet | Desired state, self-healing, scaling |
| Gave the Pods one address | Service | Stable name and IP, load balancing, found by label |
| Shipped v2, broke v3, undid it | Deployment rollout | Zero-downtime updates and rollback |
| Drained a node | Scheduler + Deployment | Workloads move to healthy nodes |

## Troubleshooting

| Problem | Fix |
|---|---|
| `kind create cluster` fails with `port is already allocated` | Something else (often another kind cluster) uses port 30080. Change `hostPort` in `kind-config.yaml` (e.g. to `30090`) and use that port in the browser and `curl` |
| Pods stuck in `ErrImagePull` for `demo-web-app:v1` | The image wasn't loaded into the cluster. Run the `kind load docker-image` command from Step 3 |
| `kubectl` talks to the wrong cluster | `kubectl config get-contexts`, then `kubectl config use-context kind-k8s-demo` |
| http://localhost:30080 doesn't respond | Check the Service exists (`kubectl get svc`) and that `nodePort: 30080` matches `containerPort` in `kind-config.yaml` |
