# ==============================================================================
# INPUT VARIABLES
# ==============================================================================
# Variables make your configurations customizable and reusable. They act like 
# function arguments in programming languages.
# Variable Overrides Precedence:
# When the same variable is set in several places, Terraform uses the one
# HIGHEST in this list (1 wins over 2, 2 over 3, and so on):
# 1. Terraform CLI flags (e.g., terraform apply -var="instance_type=t3.small", -var-file="custom.tfvars")
# 2. Auto-loaded variable files (e.g. *.auto.tfvars or *.auto.tfvars.json)
# 3. The terraform.tfvars.json file
# 4. The terraform.tfvars file
# 5. Environment variables (e.g., TF_VAR_instance_type=t3.small)
# 6. Default values in variables.tf (if no value is provided)

# ==============================================================================

variable "aws_region" {
  description = "The AWS Region where resources will be provisioned."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project. Used to prefix and tag resources."
  type        = string
  default     = "terraform-hands-on"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"

  # Validation blocks let you enforce business rules or constraints on your inputs.
  # If a user provides an invalid value, Terraform will stop and print the error message.
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "The environment variable must be one of: dev, staging, prod."
  }
}

variable "instance_type" {
  description = "The size/type of the EC2 instance."
  type        = string
  default     = "t3.micro"

  # Enforce that only small, cheap instances are used for the demo.
  validation {
    condition     = contains(["t3.micro", "t3.small", "t2.micro", "t2.small"], var.instance_type)
    error_message = "For safety and cost management in this demo, instance_type must be t3.micro, t3.small, t2.micro, or t2.small."
  }
}

variable "vpc_cidr" {
  description = "The IP range (CIDR block) for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}
