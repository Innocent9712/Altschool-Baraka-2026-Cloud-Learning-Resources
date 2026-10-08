#!/usr/bin/env bash
# Terminates the instances created by the imperative scripts.
# (Notice we need a separate, hand-written script just to undo the first one.
#  With Terraform, this is `terraform destroy`.)
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

IDS=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=week1-imperative" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)

if [[ -z "$IDS" ]]; then
  echo "Nothing to clean up."
  exit 0
fi

# $IDS is intentionally unquoted so each ID is passed as a separate argument
aws ec2 terminate-instances --region "$REGION" --instance-ids $IDS \
  --query 'TerminatingInstances[].[InstanceId,CurrentState.Name]' --output table
