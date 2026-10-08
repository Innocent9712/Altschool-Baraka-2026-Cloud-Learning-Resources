#!/usr/bin/env bash
# ==============================================================================
# IMPERATIVE, BUT "IDEMPOTENT": "Launch a server — unless one already exists"
# ==============================================================================
# We've added a check-before-create so re-running doesn't create duplicates.
#
# Demo questions:
#   - It no longer duplicates. Problem solved?
#   - What if I now want a t3.small instead of a t3.micro?
#   - What if I want to delete the server? Add a disk? Change a tag?
#   - What if someone changes the server in the console?
#
# Every one of those needs more checking logic. Keep going and you end up
# writing your own (worse) version of Terraform. That's the point.
# ==============================================================================
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="t3.micro"

# Step 0: Check whether our server already exists (by its Name tag)
EXISTING=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=week1-imperative" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)

if [[ -n "$EXISTING" ]]; then
  echo "Server already exists: $EXISTING — nothing to do."
  # NOTE: if $INSTANCE_TYPE was changed above, we silently ignore it.
  # Handling that means: stop the instance, modify it, start it again...
  exit 0
fi

AMI_ID=$(aws ssm get-parameter \
  --region "$REGION" \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameter.Value' --output text)

INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --count 1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=week1-imperative},{Key=Lesson,Value=iac-week1}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "Launched $INSTANCE_ID"
