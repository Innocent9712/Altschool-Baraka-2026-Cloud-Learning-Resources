variable "region" {
  description = "AWS region for the cluster"
  type        = string
  default     = "us-east-2"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "k8s-practice"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the control plane (see `aws eks describe-cluster-versions`)"
  type        = string
  default     = "1.37"
}
