# Week 5: Kubernetes in Practice

Last week covered the essentials: Pods, Deployments, Services, scaling and rolling updates. This week we deploy a
complete application: a React frontend, a FastAPI backend, PostgreSQL and Redis. Along the way we use the objects
that make an app production-ready: configuration and secrets, persistent storage, health checks, an Ingress, resource
limits, autoscaling, and access control.

**By the end of the week** you'll be able to take a multi-container application and run it properly on Kubernetes,
and you'll know what changes when the cluster is a managed one in the cloud.

## Learning Objectives

By the end of this week, you should be able to:

1. Organise an application in a **namespace**, and explain what namespaces do and don't isolate
2. Supply configuration with **ConfigMaps** and credentials with **Secrets**, and explain why base64 isn't encryption
3. Choose a **Service type** (ClusterIP, NodePort, LoadBalancer) and expose HTTP apps with an **Ingress**, and
   describe how the **Gateway API** extends it
4. Give stateful apps durable storage with **PersistentVolumeClaims**, **StorageClasses** and **StatefulSets**
5. Write **readiness** and **liveness** probes, and explain why they should check different things
6. Set **requests and limits**, and explain how they affect scheduling, throttling and `OOMKilled`
7. Autoscale a Deployment with a **HorizontalPodAutoscaler**
8. Grant least-privilege access with **ServiceAccounts, Roles and RoleBindings**
9. Diagnose common failures: `Pending`, `CreateContainerConfigError`, `CrashLoopBackOff`, unready Pods, Services with no endpoints
10. Describe what a managed cluster such as **Amazon EKS** provides, and what changes when you deploy to it

## Materials

| File | What it is |
|---|---|
| [kubernetes_in_practice_guide.md](./kubernetes_in_practice_guide.md) | Concepts and reference: namespaces, config, Services and Ingress, storage, probes, resources, autoscaling, RBAC, EKS, troubleshooting |
| [hands-on-demo/](./hands-on-demo/) | The live class demo: deploy the full-stack app on a local kind cluster, step by step |
| [eks/](./eks/) | Optional: create an EKS cluster with Terraform and deploy the same app to AWS (costs money) |
| [exercise/](./exercise/) | Take-home exercise: deploy the Week 3 app to Kubernetes, production-style |

## Class Outline

1. **Recap and the gap**: what Week 4's app was missing, and the Compose-to-Kubernetes mapping.
2. **Live demo**: follow [hands-on-demo/README.md](./hands-on-demo/README.md)
   - Step 1: a cluster with a cloud-style load balancer and Ingress (cloud-provider-kind)
   - Step 2: the app's images
   - Step 3: namespaces
   - Step 4: ConfigMaps and Secrets
   - Step 5: storage: a StatefulSet and its PersistentVolumeClaim
   - Step 6: the backend: probes, requests and limits
   - Step 7: Service types: ClusterIP, port-forward, LoadBalancer
   - Step 8: Ingress: one address for the whole app
   - Step 9: readiness and persistence in action
   - Step 10: autoscaling on CPU load
   - Step 11: RBAC
3. **From kind to the cloud**: what EKS provides, and what changes ([eks/](./eks/README.md)).
4. **Introduce the exercise**.

## After Class

1. Read [kubernetes_in_practice_guide.md](./kubernetes_in_practice_guide.md) and answer its *Check Your Understanding* questions
2. Repeat the hands-on demo on your own machine
3. Complete the [exercise](./exercise/README.md)
