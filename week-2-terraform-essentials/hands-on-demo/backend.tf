# ==============================================================================
# STATE BACKEND CONFIGURATION
# ==============================================================================
# By default, Terraform stores state locally in a 'terraform.tfstate' file.
# To collaborate in teams and protect state files, we configure a remote backend.
# 
# DEMO INSTRUCTIONS:
# 1. Run `terraform apply` first with this file commented out (uses Local State).
# 2. Bootstrap your S3 bucket using the AWS CLI commands found in the README.md.
# 3. Uncomment this entire block, replace the bucket name with your unique bucket name,
#    and run `terraform init`. Terraform will ask if you want to copy existing state
#    to the S3 bucket. Type "yes".
# ==============================================================================

# terraform {
#   backend "s3" {
#     # REPLACE this with your globally unique S3 bucket name
#     bucket = "your-unique-terraform-state-bucket"
#     
#     # The file path within the S3 bucket where the state file will be stored
#     key    = "hands-on-demo/terraform.tfstate"
#     
#     # AWS Region where the S3 bucket is hosted
#     region = "us-east-1"
#     
#     # Encrypts the state file at rest in S3 using AES-256
#     encrypt = true
#     
#     # NEW in Terraform 1.10+: Enables native S3 state locking using S3 versioning and conditional writes.
#     # This eliminates the need to create and manage a DynamoDB table!
#     use_lockfile = true
#   }
# }
