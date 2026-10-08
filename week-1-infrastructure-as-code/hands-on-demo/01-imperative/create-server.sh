#!/usr/bin/env bash
# ==============================================================================
# IMPERATIVE: "Launch a server"
# ==============================================================================
# A plain list of steps using the AWS CLI. It does exactly what it's told,
# every time it's run — it has no idea what already exists.
#
# Demo question: "What happens if I run this script a second time?"
# ==============================================================================
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

# Step 1: Look up the latest Amazon Linux 2023 AMI (AMI IDs differ per region and change over time)
AMI_ID=$(aws ssm get-parameter \
  --region "$REGION" \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameter.Value' --output text)

# Step 2: Launch one instance into the default VPC
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type t3.micro \
  --count 1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=week1-imperative},{Key=Lesson,Value=iac-week1}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "Launched $INSTANCE_ID"
