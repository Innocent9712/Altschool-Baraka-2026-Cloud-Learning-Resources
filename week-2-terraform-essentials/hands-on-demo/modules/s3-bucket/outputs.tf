# ==============================================================================
# LOCAL CUSTOM MODULE OUTPUTS
# ==============================================================================
# Declares what values this module will return to the caller.
# ==============================================================================

output "bucket_id" {
  description = "The ID (name) of the S3 bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket."
  value       = aws_s3_bucket.this.arn
}
