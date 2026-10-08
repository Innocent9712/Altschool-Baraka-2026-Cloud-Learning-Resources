# ==============================================================================
# LOCAL CUSTOM MODULE: S3 BUCKET
# ==============================================================================
# This module defines an S3 bucket with basic configurations. It acts as a reusable
# building block that can be instantiated multiple times with different variables.
# ==============================================================================

# Creates the S3 bucket resource
resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = true # Allows destroying bucket with objects inside during training
}

# Configures versioning for the bucket
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}
