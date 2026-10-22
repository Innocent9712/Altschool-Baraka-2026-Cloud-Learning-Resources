# Week 4 Exercise: Run, Scale, Heal, and Update an App on Your Own Cluster

## Goal

Repeat the core Kubernetes workflow from class **on your own local cluster, with YAML you write yourself**, and
explain what Kubernetes did at each step.

By the end you'll have a Git repository containing your cluster config, your manifests, and a README that records
what you ran, what happened, and why.

## What You'll Need

- Docker, `kubectl`, and `kind` installed (see the [hands-on demo](../hands-on-demo/README.md#prerequisites))
- An image to deploy. Pick **one**:
  - **Recommended:** the image you built and pushed to Docker Hub in the Week 3 exercise. You'll need at least two tags (e.g. `v1` and `v2`); make a small visible change for `v2`
  - **Or:** `traefik/whoami`, a tiny public web server that prints the hostname of the Pod that answered. Use tags `v1.10` and `v1.11`. It listens on port `80`

## Requirements

### 1. Cluster
- Write a `kind-config.yaml` for a cluster with **1 control-plane node and 2 worker nodes**.
- Forward a host port to a NodePort of your choice (see `extraPortMappings` in the class demo).
- Create the cluster and record the output of `kubectl get nodes`.

### 2. Deployment
Write `deployment.yaml` **yourself**. You may generate a starting point with
`kubectl create deployment ... --dry-run=client -o yaml`, but make sure you understand every line. It must have:
- **3 replicas** of your image (your first tag)
- A meaningful label (e.g. `app: <your-app-name>`) used consistently in `selector` and the Pod template
- The correct `containerPort`
- A `RollingUpdate` strategy where **users never have fewer than 3 working Pods during an update**

Apply it and record `kubectl get deployments,replicasets,pods -o wide`. Which nodes did the Pods land on, and why
not the control-plane node?

### 3. Service
Write `service.yaml`: a **NodePort** Service that selects your Pods.
- Show that it's load-balancing: run a `curl` loop (10+ requests) and show that **different Pods** answer. (With
  `traefik/whoami`, look at the `Hostname:` line. With your own app, add an endpoint or log line that identifies the Pod if it doesn't already.)
- Show the in-cluster DNS name working from a temporary Pod (`kubectl run ... --image=busybox:1.37 ...`).

### 4. Self-healing
Delete one Pod. Record what happened, with timestamps or `kubectl get pods` output before and after.
Which controller restored it?

### 5. Scaling
Scale to **5 replicas declaratively**: change the YAML and re-apply. Don't use `kubectl scale`. Record the result.

### 6. Rolling update and rollback
1. Update to your second tag by editing the YAML and re-applying. Record `kubectl rollout status` and
   `kubectl rollout history`, and show the new version responding.
2. Now deploy a tag that **doesn't exist**. Record:
   - the Pod status and the relevant `kubectl describe pod` events
   - proof that your app is **still serving** the previous version
3. Recover by **fixing the YAML** and re-applying (not with `rollout undo`). Explain why that's preferable.

### 7. Node maintenance
Drain one worker node. Record where the Pods went and confirm that all 5 are still running. Then uncordon it.
Do the Pods move back? Why or why not?

### 8. Clean up
Delete your resources with `kubectl delete -f` and delete the cluster.

## Questions to Answer in Your README

1. Describe, step by step, which Kubernetes components were involved between `kubectl apply -f deployment.yaml` and your Pods running.
2. What's the relationship between your Deployment, its ReplicaSets, and its Pods? How many ReplicaSets existed after step 6, and why does Kubernetes keep the old ones?
3. Your Service selects Pods by label. What would happen if you changed the label in the Pod template but not in the Service?
4. During the broken rollout in step 6, why didn't users get errors? Which setting made that true?
5. When would you use `ClusterIP` instead of `NodePort`? When would you use `LoadBalancer`?

## Deliverable

A GitHub repository containing:
- `kind-config.yaml`, `deployment.yaml`, `service.yaml` (and the second/broken versions of your Deployment, if you kept them as separate files)
- A `README.md` with, for each step: the commands you ran, the relevant output (trimmed to what matters), and a short explanation of what happened. Then the answers to the questions above

## Submitting Your Work for Review

Use Pull Requests (PRs) to present your changes incrementally. Follow this branching strategy:

```
feature/name-of-the-feature -> review -> main
```

- Create a **feature branch** for each piece of work (e.g. `feature/deployment`, `feature/service`, `feature/rolling-update`).
- When a feature is complete, merge it into a **`review`** branch.
- Once you're ready for feedback, open a PR from `review` → `main` and request a review.
- Reviews will be provided as comments on that PR. You can address feedback on new fix/feature branches, merge them into the open PR, and request another round of review, or merge directly to `main` if you prefer.

When submitting, provide links to your PRs so the progression of changes is easy to follow.
