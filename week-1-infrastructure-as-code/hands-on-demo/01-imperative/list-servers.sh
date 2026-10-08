#!/usr/bin/env bash
# Lists every live instance created during this lesson (imperative and declarative).
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Lesson,Values=iac-week1" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].{Name: Tags[?Key==`Name`]|[0].Value, Id: InstanceId, Type: InstanceType, State: State.Name}' \
  --output table
