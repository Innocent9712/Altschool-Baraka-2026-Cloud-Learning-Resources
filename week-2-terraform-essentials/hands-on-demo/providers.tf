# ==============================================================================
# PROVIDERS CONFIGURATION
# ==============================================================================
# In Terraform, providers are plugins that interact with cloud providers, SaaS
# providers, and other APIs. This file declares the versions and configurations
# for the providers our project requires.
# ==============================================================================

terraform {
  # Pins the minimum Terraform CLI version required to run this code.
  # We require >= 1.10.0 because of S3 native state locking (use_lockfile = true).
  required_version = ">= 1.10.0"

  # Declares which provider plugins are required and where to download them.
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # Allows any 6.x release (6.1, 6.20, ...) but never 7.0.
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0" # Used to generate a unique suffix for globally-unique S3 bucket names.
    }
  }
}

# The provider block configures the specified provider (AWS).
# Credentials are NOT set here — Terraform picks them up automatically from
# environment variables or your AWS CLI configuration (`aws configure`).
provider "aws" {
  region = var.aws_region

  # Default tags are automatically applied to every AWS resource this provider
  # creates. This is a best practice to enforce consistent tagging without
  # repeating a tags block on each resource.
  default_tags {
    tags = local.common_tags
  }
}
