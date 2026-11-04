# Week 5 Exercise: Take the Week 3 App to Kubernetes

## Goal

In Week 3 you ran a FastAPI + PostgreSQL app with Docker Compose
([week-3 hands-on demo](../../week-3-container-technology-and-docker/hands-on-demo/)). This week, **deploy the same
app to your own kind cluster, the way it would run in production**: its own namespace, configuration and secrets
outside the image, a database that keeps its data, health checks, an Ingress, autoscaling and least-privilege access.

You write every manifest yourself. Use the class demo's `k8s/` folder as a reference, not a template to copy: this
app is different in a few ways you'll have to work out.

## What You'll Need

- Docker, `kubectl`, `kind`, and cloud-provider-kind (see the [hands-on demo](../hands-on-demo/README.md#prerequisites))
- The Week 3 app image. Build it from `week-3-container-technology-and-docker/hands-on-demo/` with the production
  `Dockerfile`, or use the image you pushed to Docker Hub in Week 3

## How This App Differs from the Class Demo

Read the Week 3 app's `main.py` and `compose.yaml` before you start:

- It reads **one** variable for the database, `DATABASE_URL`, which **contains the password**
  (`postgresql://user:password@host:5432/db`). The password must still come from a Secret, not a ConfigMap and not
  the image. (Hint: look up *dependent environment variables*, `$(VAR_NAME)`, in the Kubernetes docs.)
- Its routes are at the root (`/health`, `/users`), not under `/api`.
- It has only a `/health` endpoint, which doesn't touch the database. Is that the right readiness check? Is there
  an endpoint that would be better?

## Requirements

### 1. Namespace and Cluster
- A kind cluster (1 control plane, 2 workers) with cloud-provider-kind running.
- Everything in a namespace called `week3-app`, created from a manifest.

### 2. Configuration
- A **ConfigMap** for the non-secret settings.
- A **Secret** for the database username and password, **created with `kubectl`**. No real password in any file in
  your repository. Record the command you used, with the password replaced by a placeholder.
- The app's `DATABASE_URL` assembled from these, without the password ever appearing in a manifest.

### 3. Database
- PostgreSQL as a **StatefulSet** with a PersistentVolumeClaim, and a Service for the app to reach it.
- A readiness probe for Postgres.
- Requests and a memory limit.

### 4. The App
- A **Deployment** with **2 replicas** and a ClusterIP Service.
- **Readiness and liveness probes**. Explain in your README which endpoint each one uses and why.
- **Requests and limits** for CPU and memory.

### 5. Ingress
- An **Ingress** that exposes the app. Show it working with `curl` through the address from `show-urls.sh` (copy the
  script from the demo, or find the port with `docker ps`):
  - create two users with `POST /users`
  - list them with `GET /users`
  - call `/health` several times and show that **both** Pods answer (the response includes the hostname)

### 6. Prove the Behaviour
Record the commands and the relevant output for each:
1. **Persistence**: delete the Postgres Pod. After it's recreated, your users are still there.
2. **Readiness**: scale Postgres to 0. Show the app Pods' READY column and the Service's endpoints, and what
   `GET /users` returns. Then scale it back. If your app Pods were *restarted* instead, your probes are wrong: fix
   them and explain what you changed.
3. **Config change**: change a value in your ConfigMap. Show that the running Pods don't see it until you run
   `kubectl rollout restart`.

### 7. Autoscaling
- Install metrics-server, and add an **HPA** for the app (min 2, max 5, 60% CPU).
- Generate load from a Pod inside the cluster and record `kubectl get hpa` scaling up, then (after stopping the load)
  back down.

### 8. Access Control
- Create a ServiceAccount `support` that can **view Pods and their logs, and view (but not change) Deployments** in
  `week3-app`, and nothing else.
- Prove it with `kubectl auth can-i ... --as=system:serviceaccount:week3-app:support`: at least three `yes` and
  three `no` answers, including `get secrets`.

### 9. Clean Up
Delete the namespace and the cluster, and stop cloud-provider-kind.

## Questions to Answer in Your README

1. What's the difference between a ConfigMap and a Secret, in how they're stored and in how you should handle them? Why isn't base64 protection?
2. Why a StatefulSet for Postgres and a Deployment for the app? What would go wrong with Postgres in a Deployment with 2 replicas?
3. Walk through what happens, component by component, when a request from `curl` reaches your app through the Ingress.
4. Your readiness and liveness probes: which endpoint does each use, and what would happen during a database outage if you'd swapped them?
5. Your HPA targets 60% CPU. 60% of what, exactly? What would the HPA do if you removed the CPU request?
6. Why does the `support` ServiceAccount get a Role and RoleBinding, not a ClusterRole and ClusterRoleBinding?

## Stretch Goals (Optional)

- **Private image**: push the app image to a **private** Docker Hub repository, delete it from your machine and the
  cluster (`docker image rm`, then recreate the cluster), and make the Deployment pull it with an image pull Secret.
- **Gateway API**: replace your Ingress with a Gateway and an HTTPRoute.
- **A second environment**: deploy a second copy to a `week3-app-staging` namespace, with different config and a
  different Secret, from the same manifests.
- **EKS**: follow [../eks/README.md](../eks/README.md) to run your app on Amazon EKS. **This costs money**: destroy
  everything when you're done, and record how you checked nothing was left behind.

## Deliverable

A GitHub repository containing:
- Your manifests (in a `k8s/` folder), and your `kind-config.yaml`
- A `README.md` with, for each requirement: the commands you ran, the relevant output (trimmed to what matters),
  and a short explanation. Then the answers to the questions above
- **No passwords, tokens or kubeconfig files.** Check with `git log -p | grep -i password` before you submit

## Submitting Your Work for Review

Use Pull Requests (PRs) to present your changes incrementally. Follow this branching strategy:

```
feature/name-of-the-feature -> review -> main
```

- Create a **feature branch** for each piece of work (e.g. `feature/config`, `feature/database`, `feature/ingress`).
- When a feature is complete, merge it into a **`review`** branch.
- Once you're ready for feedback, open a PR from `review` → `main` and request a review.
- Reviews will be provided as comments on that PR. You can address feedback on new fix/feature branches, merge them into the open PR, and request another round of review, or merge directly to `main` if you prefer.

When submitting, provide links to your PRs so the progression of changes is easy to follow.
