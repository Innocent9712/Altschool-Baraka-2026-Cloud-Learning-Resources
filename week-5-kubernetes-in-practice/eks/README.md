# Going Further: The Same App on Amazon EKS

> **This creates AWS resources that cost money while they exist**: the EKS control plane, worker nodes, a NAT
> gateway and a load balancer. Always finish with [Clean Up](#7-clean-up).

The hands-on demo ran on kind. Here we run the **same manifests** on **Amazon EKS** (Elastic Kubernetes Service), a
managed cluster. That shows what changes between a laptop and a cloud: surprisingly little in the app's YAML, and
a lot in what the platform provides.

| | kind (the demo) | EKS Auto Mode (here) |
|---|---|---|
| Control plane | A Docker container on your laptop | Run by AWS, across several availability zones |
| Worker nodes | Docker containers | EC2 instances, created and replaced by AWS as Pods need them |
| Images | Copied in with `kind load` | **Pulled from a registry** (Docker Hub here) |
| PersistentVolumeClaims | Folders on a node (local-path) | EBS volumes |
| Service type LoadBalancer | cloud-provider-kind container | AWS Network Load Balancer |
| Ingress | cloud-provider-kind | AWS Application Load Balancer |

This uses **EKS Auto Mode**: AWS also manages the nodes, the EBS storage driver and the load balancer controller,
which you'd otherwise install and maintain yourself.

## Prerequisites

- Terraform, the AWS CLI with credentials configured (Week 2), `kubectl`, Docker
- A Docker Hub account (Week 3)

## Files

| File | Purpose |
|---|---|
| `versions.tf`, `variables.tf` | Terraform and provider versions; region, cluster name and Kubernetes version |
| `main.tf` | A VPC (public and private subnets, one NAT gateway) and an EKS Auto Mode cluster, using the community modules |
| `outputs.tf` | The cluster name, and the command to get its credentials |
| `cluster-setup.yaml` | A default StorageClass (EBS) and an IngressClass (ALB). On kind these came for free |
| `ingress.yaml` | The demo's Ingress, with `ingressClassName: alb` instead of `cloud-provider-kind` |

## 1. Push the Images to a Registry

EKS nodes can't see images on your laptop. Push both images to Docker Hub (replace `<you>` with your Docker Hub
username). Build them for **both CPU types**: AWS may run your Pods on Intel/AMD (`amd64`) or Graviton (`arm64`)
nodes, and an image built on an Apple Silicon Mac is `arm64` only.

```bash
cd ../hands-on-demo
docker login
docker buildx build --platform linux/amd64,linux/arm64 -t <you>/demo-backend:v1 --push app/backend/
docker buildx build --platform linux/amd64,linux/arm64 -t <you>/demo-frontend:v1 --push app/frontend/
cd ../eks
```

## 2. Create the Cluster

```bash
terraform init
terraform plan        # a VPC, an EKS cluster, IAM roles: around 60 resources
terraform apply       # takes a while: the control plane alone is several minutes
```

Write the cluster's credentials to a **separate kubeconfig** file, so your other clusters aren't affected, and use
it for this terminal:

```bash
aws eks update-kubeconfig --region us-east-2 --name k8s-practice --kubeconfig ./eks.kubeconfig
export KUBECONFIG=$PWD/eks.kubeconfig
kubectl get nodes     # "No resources found": Auto Mode only creates nodes when Pods need them
```

## 3. Set Up the Cluster

```bash
kubectl apply -f cluster-setup.yaml
kubectl get storageclass,ingressclass
```

## 4. Deploy the App

Apply the same manifests as on kind, except the Ingress:

```bash
kubectl apply -f ../hands-on-demo/k8s/00-namespace.yaml -f ../hands-on-demo/k8s/01-configmap.yaml
kubectl config set-context --current --namespace=demo-app

kubectl create secret generic db-credentials \
  --from-literal=POSTGRES_USER=appuser \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)"

kubectl apply -f ../hands-on-demo/k8s/02-postgres.yaml -f ../hands-on-demo/k8s/03-redis.yaml \
  -f ../hands-on-demo/k8s/04-backend.yaml -f ../hands-on-demo/k8s/05-frontend.yaml
```

The backend and frontend manifests name the local images `demo-backend:v1` and `demo-frontend:v1`. Point them at
your registry:

```bash
kubectl set image deployment/backend backend=<you>/demo-backend:v1
kubectl set image deployment/frontend frontend=<you>/demo-frontend:v1
```

(`kubectl set image` changes the cluster without changing the YAML, which is drift. Fine for a one-off. In a real
project you'd keep one set of manifests and a small per-environment override: tools like **Kustomize**, built into
`kubectl apply -k`, and **Helm** exist to do exactly that.)

```bash
kubectl get pods -w      # Pending while Auto Mode launches a node, then Running. Ctrl+C
kubectl get nodes        # nodes appeared because Pods needed them
kubectl get pvc          # Bound to a new EBS volume
```

Now the Ingress:

```bash
kubectl apply -f ingress.yaml
kubectl get ingress -w   # ADDRESS gets an AWS hostname after a few minutes. Ctrl+C
```

Open `http://<that hostname>` in your browser. It may take another minute or two before the load balancer answers.

## 5. Private Images: Registry Credentials

If your Docker Hub repositories are **private**, the nodes need credentials to pull them, or the Pods sit in
`ErrImagePull` with `401 Unauthorized`. That's a Secret of type `docker-registry`:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<you> \
  --docker-password=<a Docker Hub access token, not your password>
```

Then reference it from the Pod spec (`imagePullSecrets`), or attach it to the namespace's `default` ServiceAccount
so every Pod in the namespace uses it:

```bash
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}'
kubectl rollout restart deployment/backend deployment/frontend
```

(On AWS, teams more often use **Amazon ECR** as the registry: nodes are allowed to pull from it through their IAM
role, so no pull Secret is needed.)

## 6. Things to Try

- `kubectl expose deployment frontend --name=frontend-lb --type=LoadBalancer --port=80 --target-port=8080`: a
  second, separate AWS load balancer appears (and is billed). Delete it with `kubectl delete service frontend-lb`.
- Delete `postgres-0` and check that your data survives, as on kind. The EBS volume follows the Pod.
- Drain a node (Week 4) and watch Auto Mode replace it.

## 7. Clean Up

Delete the Kubernetes objects **first**. The load balancers and EBS volumes were created by Kubernetes, not by
Terraform, so `terraform destroy` doesn't know about them, and leftover load balancers can block deleting the VPC.

```bash
kubectl delete namespace demo-app        # removes the ALB, the EBS volume and everything else in it
kubectl delete -f cluster-setup.yaml
terraform destroy
rm eks.kubeconfig
unset KUBECONFIG
```

Check the AWS console (EC2 > Load Balancers, EC2 > Volumes) that nothing tagged with the cluster name is left.

## Troubleshooting

| Problem | Fix |
|---|---|
| Pods `Pending` for a long time | Normal at first: Auto Mode is launching a node. `kubectl describe pod` shows the events |
| Pods in `ErrImagePull`, `no match for platform` | The image was built for one CPU type only. Rebuild with `--platform linux/amd64,linux/arm64` |
| Pods in `ErrImagePull`, `401 Unauthorized` | Private repository: create the pull Secret (step 5) |
| Ingress has no ADDRESS | `kubectl describe ingress demo-app` shows the events. Check `cluster-setup.yaml` was applied |
| The site returns `503` | The load balancer's health checks haven't passed yet. Wait a minute, and check the backend and frontend Pods are `1/1` |
| `terraform destroy` hangs on the VPC or subnets | A load balancer created by Kubernetes still exists. Delete the namespace (or the load balancer in the console), then run `terraform destroy` again |
