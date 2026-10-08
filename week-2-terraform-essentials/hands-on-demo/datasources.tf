# ==============================================================================
# DATA SOURCES
# ==============================================================================
# Data sources allow Terraform to use information defined outside of Terraform,
# or defined by another separate Terraform configuration. They are read-only.
# ==============================================================================

# 1. Fetch the latest official Ubuntu 24.04 LTS AMI in the current region.
# This prevents hardcoding AMI IDs which change across regions and over time.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official AWS Account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 2. Get the list of all available Availability Zones in the current AWS region.
data "aws_availability_zones" "available" {
  state = "available"
}

# 3. Retrieve details about the current AWS Account and credentials used.
# This is useful for auditing, applying security policies, or outputting logs.
data "aws_caller_identity" "current" {}
