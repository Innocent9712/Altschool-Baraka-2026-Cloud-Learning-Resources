# ==============================================================================
# MAIN CONFIGURATION
# ==============================================================================
# This file declares our target infrastructure. It is sectioned so that you can
# comment parts in or out to show how Terraform handles resource creation,
# dependency resolution, update-in-place, and destruction.
# ==============================================================================

# ==============================================================================
# SECTION 1: NETWORKING WORKSPACE (Always Active)
# ==============================================================================
# Creates the network foundation: Virtual Private Cloud (VPC), a Subnet, an
# Internet Gateway (IGW) for public routing, and Route Tables.
# ==============================================================================

# 1.1 VPC Resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# 1.2 Internet Gateway (to allow internet connectivity to the VPC)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

# 1.3 Public Subnet (created in the first available AZ of the region)
resource "aws_subnet" "main" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true # Automatically assign a public IP to EC2 instances

  tags = {
    Name = "${local.name_prefix}-subnet"
  }
}

# 1.4 Route Table (defines rules directing network traffic out to the Internet Gateway)
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-rt"
  }
}

# 1.5 Route Table Association (binds the route table rules to our subnet)
resource "aws_route_table_association" "main" {
  subnet_id      = aws_subnet.main.id
  route_table_id = aws_route_table.main.id
}


# ==============================================================================
# SECTION 2: SECURITY GROUP (Uncomment to show Resource Addition)
# ==============================================================================
# Configures firewalls for our web server.
# ==============================================================================

# resource "aws_security_group" "web" {
#   name        = "${local.name_prefix}-web-sg"
#   description = "Security Group for the web server"
#   vpc_id      = aws_vpc.main.id

#   # Inbound HTTP Traffic
#   ingress {
#     description = "Allow HTTP traffic"
#     from_port   = 80
#     to_port     = 80
#     protocol    = "tcp"
#     cidr_blocks = ["0.0.0.0/0"]
#   }

#   # Outbound Traffic to anywhere
#   egress {
#     description = "Allow all outbound traffic"
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }

#   tags = {
#     Name = "${local.name_prefix}-web-sg"
#   }
# }


# ==============================================================================
# SECTION 3: COMPUTE (Uncomment to show Provisioning, User Data, and Outputs)
# ==============================================================================
# Launches an EC2 instance inside our public subnet, configures Nginx,
# and deploys a dynamic webpage using standard Terraform templating.
#
# IMPORTANT: When uncommenting this section, you MUST also uncomment the
# EC2-related outputs in outputs.tf!
# ==============================================================================

# resource "aws_instance" "web" {
#   # Dynamically queries the latest Ubuntu AMI from our data source
#   ami           = data.aws_ami.ubuntu.id
#   instance_type = var.instance_type
#
#   # References to other resources create IMPLICIT dependencies: Terraform
#   # knows it must create the subnet and security group before this instance.
#   # No depends_on needed.
#   subnet_id              = aws_subnet.main.id
#   vpc_security_group_ids = [aws_security_group.web.id]
#
#   # templatefile reads a local file and performs variable substitution
#   user_data = templatefile("${path.module}/user_data.sh", {
#     project_name = var.project_name
#     environment  = var.environment
#   })
#
#   # Security best practice: require IMDSv2 (session tokens) for the instance
#   # metadata service. user_data.sh already uses the token-based approach.
#   metadata_options {
#     http_tokens = "required"
#   }
#
#   tags = {
#     Name = "${local.name_prefix}-web-server"
#   }
#
#   # Optional show-and-tell: lifecycle rules change HOW Terraform replaces a
#   # resource. create_before_destroy builds the new instance before deleting
#   # the old one, reducing downtime during a replacement.
#   # lifecycle {
#   #   create_before_destroy = true
#   # }
# }

# ==============================================================================
# SECTION 4: MODULES (Uncomment to show Module instantiation)
# ==============================================================================
# Modules are containers for multiple resources that are used together.
# This section demonstrates calling a local module and a remote registry module.
# 
# IMPORTANT: When uncommenting this section:
# 1. Run `terraform init` to download the remote registry module.
# 2. Uncomment the module-related outputs in outputs.tf!
# ==============================================================================

# Random suffix so bucket names are globally unique — S3 bucket names are shared
# across ALL AWS accounts, so "class-bucket" would clash between students.
# resource "random_id" "bucket_suffix" {
#   byte_length = 4
# }

# 4.1 Local Module instantiation
# Calls the custom S3 bucket module defined locally in modules/s3-bucket.
# The same module is called twice with different inputs — that's the reuse.
# module "assets_bucket" {
#   source             = "./modules/s3-bucket"
#   bucket_name        = "${local.name_prefix}-assets-${random_id.bucket_suffix.hex}"
#   versioning_enabled = true
# }
#
# module "logs_bucket" {
#   source             = "./modules/s3-bucket"
#   bucket_name        = "${local.name_prefix}-logs-${random_id.bucket_suffix.hex}"
#   versioning_enabled = false
# }

# 4.2 Remote Registry Module instantiation
# Calls the community-maintained security group module from the Terraform Registry.
# Always pin a version for registry modules.
# module "remote_http_sg" {
#   source  = "terraform-aws-modules/security-group/aws//modules/http-80"
#   version = "~> 5.0"
#
#   name        = "${local.name_prefix}-remote-http-sg"
#   description = "Security group with HTTP ports open for public, created via remote module"
#   vpc_id      = aws_vpc.main.id
#
#   ingress_cidr_blocks = ["0.0.0.0/0"]
# }
