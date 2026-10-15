terraform {
  required_version = "1.15.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}


locals {
  custom_amazon_ami = "ami-08bbae665871c7cfe"
  server_key_name   = "web-server-key"
}

data "aws_ami" "amazon_ami" {
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["amazon"]
}

resource "aws_instance" "test-instance" {
  ami           = data.aws_ami.amazon_ami.id
  instance_type = var.custom_instance_type
  #   key_name      = local.server_key_name

  tags = {
    Name = "test-instance"
  }
}

resource "aws_instance" "test-instance-2" {
  ami           = local.custom_amazon_ami
  instance_type = var.custom_instance_type

  tags = {
    Name = "test-instance-2-updated"
  }
}

resource "aws_instance" "test-instance-3" {
  ami           = local.custom_amazon_ami
  instance_type = var.custom_instance_type

  tags = {
    Name = "test-instance-3"
  }
}

variable "custom_instance_type" {
  type        = string
  description = "Instance type for my project"
  default     = "t3.micro"
}


output "instance_id" {
  value = aws_instance.test-instance.id
}

output "instance_public_ip" {
  value = aws_instance.test-instance.public_ip
}
