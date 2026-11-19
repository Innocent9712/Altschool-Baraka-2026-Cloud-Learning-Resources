# One small EC2 server for the pipeline to deploy to.
# Staging and production both run on it, as two containers on different ports:
#   staging    -> port 8080
#   production -> port 80
# In a real team they'd be separate servers (or clusters), usually in separate accounts.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for the server"
  type        = string
  default     = "us-east-1"
}

variable "public_key_path" {
  description = "The deploy key's PUBLIC half. The private half goes into a GitHub secret"
  type        = string
  default     = "~/.ssh/shop-deploy.pub"
}

# The latest Ubuntu 24.04 image, as in Week 2
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# The account's default VPC, to keep this short
data "aws_vpc" "default" {
  default = true
}

# The pipeline logs in with this key
resource "aws_key_pair" "deploy" {
  key_name   = "shop-deploy"
  public_key = file(pathexpand(var.public_key_path))
}

resource "aws_security_group" "server" {
  name        = "shop-server"
  description = "SSH for the pipeline, plus the staging and production ports"
  vpc_id      = data.aws_vpc.default.id

  # GitHub-hosted runners don't have fixed IP addresses, so SSH is open to everyone.
  # Only the deploy key can log in. Week 8 looks at safer ways in.
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Production"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Staging"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Anything out, e.g. pulling images"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  key_name               = aws_key_pair.deploy.key_name
  vpc_security_group_ids = [aws_security_group.server.id]

  # Install Docker on first boot, and let the ubuntu user run it
  user_data = <<-SCRIPT
    #!/bin/bash
    apt-get update -y
    apt-get install -y docker.io
    systemctl enable --now docker
    usermod -aG docker ubuntu
  SCRIPT

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name = "shop-server"
  }
}

output "server_ip" {
  description = "Store this as the SERVER_HOST variable in GitHub"
  value       = aws_instance.server.public_ip
}

output "staging_url" {
  value = "http://${aws_instance.server.public_ip}:8080"
}

output "production_url" {
  value = "http://${aws_instance.server.public_ip}"
}

output "ssh" {
  description = "Log in yourself, to look around"
  value       = "ssh -i ~/.ssh/shop-deploy ubuntu@${aws_instance.server.public_ip}"
}
