# ==============================================================================
# LOCAL CUSTOM MODULE VARIABLES
# ==============================================================================
# Declares parameters required by this module. These must be supplied by the
# calling module (e.g. root module).
# ==============================================================================

variable "bucket_name" {
  description = "The name of the S3 bucket to create. Must be globally unique."
  type        = string
}

variable "versioning_enabled" {
  description = "If set to true, versioning will be enabled on the S3 bucket."
  type        = bool
  default     = true
}
