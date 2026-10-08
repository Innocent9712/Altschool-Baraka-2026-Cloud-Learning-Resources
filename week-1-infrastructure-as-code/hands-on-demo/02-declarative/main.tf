# ==============================================================================
# DECLARATIVE: "There should be exactly one server that looks like this"
# ==============================================================================
# The same server as ../01-imperative/create-server.sh — but described as an
# END STATE instead of a list of steps. Terraform compares this file with what
# actually exists and works out what (if anything) needs to change.
#
# This week we only care about the IDEAS (declarative, idempotent, state,
# drift). Don't worry about the syntax yet — Week 2 is all about Terraform.
# ==============================================================================

terraform {
  required_version = ">= 1.10.0"

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

# ------------------------------------------------------------------------------
# Inputs — change these (or pass -var on the CLI) to show updates
# ------------------------------------------------------------------------------
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# ------------------------------------------------------------------------------
# Look up the latest Amazon Linux 2023 AMI — same lookup the bash script does
# ------------------------------------------------------------------------------
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# ------------------------------------------------------------------------------
# The desired end state: ONE server with these properties
# ------------------------------------------------------------------------------
resource "aws_instance" "web" {
  ami           = data.aws_ssm_parameter.al2023.insecure_value
  instance_type = var.instance_type

  tags = {
    Name        = "week1-declarative"
    Lesson      = "iac-week1"
    Environment = "dev"
  }
}

# ------------------------------------------------------------------------------
# Outputs — values Terraform prints after apply
# ------------------------------------------------------------------------------
output "instance_id" {
  value = aws_instance.web.id
}

output "instance_type" {
  value = aws_instance.web.instance_type
}
