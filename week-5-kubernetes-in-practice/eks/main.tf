data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 2)

  tags = {
    Project   = var.cluster_name
    Lesson    = "k8s-week5"
    ManagedBy = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Network: worker nodes in private subnets, load balancers in public subnets.
# One NAT gateway (not one per AZ) lets the private nodes reach the internet to
# pull images; that's cheaper, but not highly available.
# ------------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.7"

  name = var.cluster_name
  cidr = local.vpc_cidr

  azs             = local.azs
  private_subnets = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 4, i)]
  public_subnets  = [for i, az in local.azs : cidrsubnet(local.vpc_cidr, 8, i + 48)]

  enable_nat_gateway = true
  single_nat_gateway = true

  # These tags tell EKS which subnets to put internet-facing and internal load balancers in
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

# ------------------------------------------------------------------------------
# EKS in Auto Mode: AWS runs the control plane AND manages the worker nodes,
# block storage (EBS) and load balancers. That's what lets the same manifests
# from the kind demo run here with only small changes (see README.md).
# ------------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.28"

  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version

  # Reach the API server from your laptop. Production clusters often restrict this.
  endpoint_public_access = true

  # Make whoever runs `terraform apply` a cluster admin, so kubectl works straight away
  enable_cluster_creator_admin_permissions = true

  compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  tags = local.tags
}
