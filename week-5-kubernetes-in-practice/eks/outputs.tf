output "cluster_name" {
  value = module.eks.cluster_name
}

output "region" {
  value = var.region
}

output "configure_kubectl" {
  description = "Run this to write the cluster's credentials to a separate kubeconfig file"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name} --kubeconfig ./eks.kubeconfig"
}
