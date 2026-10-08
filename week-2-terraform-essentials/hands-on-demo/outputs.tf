# ==============================================================================
# OUTPUTS
# ==============================================================================
# Outputs are like return values in programming. They print important resource
# attributes to the terminal screen after a successful apply, and can be queried
# using `terraform output`.
# ==============================================================================

output "vpc_id" {
  description = "The ID of the VPC."
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "The ID of the Subnet."
  value       = aws_subnet.main.id
}

# output "security_group_id" {
#   description = "The ID of the security group for the web server."
#   value       = aws_security_group.web.id
# }

# Note: The output below references the EC2 instance.
# When Section 3 (EC2 instance) is commented out in main.tf, this output will throw
# an error because the resource 'aws_instance.web' doesn't exist.
# 
# DEMO INSTRUCTIONS:
# If you comment out Section 3 in main.tf, you must also comment out this output block!
# output "web_server_public_ip" {
#   description = "The public IP address of the web server."
#   value       = aws_instance.web.public_ip
# }

# output "web_server_url" {
#   description = "The HTTP URL to access the web server."
#   value       = "http://${aws_instance.web.public_ip}"
# }

output "aws_account_id" {
  description = "The AWS Account ID where resources were deployed."
  value       = data.aws_caller_identity.current.account_id
}

# ==============================================================================
# SECTION 4 MODULE OUTPUTS (Uncomment when Section 4 is active in main.tf)
# ==============================================================================
# output "assets_bucket_name" {
#   description = "The name of the assets bucket created by the local module."
#   value       = module.assets_bucket.bucket_id
# }
#
# output "logs_bucket_name" {
#   description = "The name of the logs bucket created by the same local module."
#   value       = module.logs_bucket.bucket_id
# }
# 
# output "module_remote_sg_id" {
#   description = "The ID of the Security Group created by the remote registry module."
#   value       = module.remote_http_sg.security_group_id
# }

