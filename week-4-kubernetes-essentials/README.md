# Week 4: Kubernetes Essentials

This week introduces Kubernetes, the leading platform for managing containerized applications at scale. You'll learn
about its core components, such as Pods, nodes, and clusters, and understand how Kubernetes automates deployment,
scaling, and management of applications.

**By the end of the week** you'll have a foundational understanding of how Kubernetes works and how it helps
orchestrate and manage containers efficiently in a cloud environment.

## Learning Objectives

By the end of this week, you should be able to:

1. Explain what problems container orchestration solves that Docker and Compose don't
2. Describe the Kubernetes architecture: the **control plane** (API server, etcd, scheduler, controller manager) and **nodes** (kubelet, kube-proxy, container runtime)
3. Explain the **desired state** model and the **reconciliation loop**, and how they produce self-healing
4. Describe and write YAML for a **Pod**, a **Deployment**, and a **Service**, and explain how a Deployment manages **ReplicaSets**
5. Use **labels and selectors** to connect objects
6. Scale a Deployment, perform a **rolling update**, and **roll back**
7. Use `kubectl` to inspect and troubleshoot: `get`, `describe`, `logs`, `exec`
8. Name the ways to run Kubernetes (local, managed, self-managed) and when to use each

## Materials

| File | What it is |
|---|---|
| [kubernetes_guide.md](./kubernetes_guide.md) | Concepts and reference: architecture, desired state, core objects, rollouts, kubectl, troubleshooting |
| [hands-on-demo/](./hands-on-demo/) | The live class demo: a 3-node local cluster with kind. Pods, Deployments, self-healing, scaling, Services, rolling updates, node draining |
| [exercise/](./exercise/) | Take-home exercise: run, scale, heal, and update your own app on your own local cluster |

## Class Outline

1. **The problem**: Docker and Compose run containers on one machine. What about 20 copies on 10 servers?
2. **Concepts**: architecture (control plane and nodes), desired state and reconciliation, Pods → ReplicaSets → Deployments, labels and Services.
3. **Live demo**: follow [hands-on-demo/README.md](./hands-on-demo/README.md)
   - Step 1: a cluster and its nodes, and the control-plane components running as Pods
   - Step 2: a bare Pod, and what happens when it's deleted
   - Step 3: a Deployment
   - Step 4: self-healing
   - Step 5: scaling
   - Step 6: a Service, load balancing, and cluster DNS
   - Step 7: a rolling update, a broken release, and rollback
   - Step 8: draining a node
4. **Ways to run Kubernetes**: local, managed (EKS/GKE/AKS), self-managed.
5. **Introduce the exercise**, and what's coming in Week 5.

## After Class

1. Read [kubernetes_guide.md](./kubernetes_guide.md) and answer its *Check Your Understanding* questions
2. Install `kubectl` and `kind`, and repeat the hands-on demo on your own machine
3. Complete the [exercise](./exercise/README.md)
