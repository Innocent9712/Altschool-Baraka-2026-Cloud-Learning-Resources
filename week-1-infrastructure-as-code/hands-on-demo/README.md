# Week 1 Hands-On Demo: ClickOps → Script → Code

**Goal**: Make the core IaC ideas *visible* — imperative vs declarative, idempotency, state, and drift — by creating
the **same server three ways** and watching how each one behaves when you run it again or someone changes it by hand.

This is **not** a Terraform syntax lesson (that's Week 2).

**Cost**: a few cents (a handful of short-lived `t3.micro` instances). **Destroy everything at the end.**

---

## Prerequisites

- AWS CLI v2 configured (`aws sts get-caller-identity` works)
- Terraform ≥ 1.10 installed
- A **default VPC** in your region (most accounts have one; `aws ec2 describe-vpcs --filters Name=is-default,Values=true`)
- Have the AWS Console open on **EC2 → Instances**, filtered by tag `Lesson = iac-week1`

Optional: `export AWS_REGION=<your-region>` (defaults to `us-east-1`). If you change it, also pass `-var aws_region=<your-region>` to Terraform.

---

## Act 1 — ClickOps

1. In the AWS Console, start the **Launch instance** wizard. Don't launch — just scroll through it.
2. Count the decisions out loud: name, AMI, instance type, key pair, VPC, subnet, public IP, security group, storage, tags...

Manual work isn't repeatable, isn't reviewable, and leaves no history.

---

## Act 2 — Imperative script

```bash
cd 01-imperative
```

### 2a. Run the script

Open `create-server.sh` and walk through it: look up an AMI, then `run-instances`. It's simple and readable, and it's already
much better than clicking. This is already "infrastructure as code" in the loosest sense: it's written down and repeatable.

```bash
./create-server.sh
./list-servers.sh
```

### 2b. Run it again

```bash
./create-server.sh
./list-servers.sh
```

**Result**: Two servers. Show both in the Console.
This script is **not idempotent**. In a CI pipeline that runs on every commit, you'd get a new server per commit.

### 2c. "Fix" it with a check

Open `create-server-idempotent.sh` and point out the new `describe-instances` check.

```bash
./create-server-idempotent.sh
```

**Result**: "Server already exists — nothing to do." Idempotent, at least for *creating* the server.

To make imperative scripts safe, you end up writing logic to *compare what exists with what you want, then
work out the steps*. **That logic is exactly what declarative tools give you for free.**

### 2d. Clean up the imperative servers

```bash
./cleanup.sh
```

We needed *another* hand-written script just to undo the first one.

---

## Act 3 — Declarative with Terraform

```bash
cd ../02-declarative
```

Open `main.tf`. *"This says: there should be ONE server, this type, with these tags.
It doesn't say 'create'. It's a description, not a list of instructions."*

### 3a. Preview, then apply

```bash
terraform plan
```

`Plan: 1 to add`. The tool compared the description with reality, worked
out that one server is missing, and is *telling us before it does anything*.

```bash
terraform apply        # type "yes"
```

### 3b. Apply again: idempotency

```bash
terraform apply
```

**Result**: `No changes. Your infrastructure matches the configuration.`
Same code, run twice, same result. **Idempotent by design**, with no checking logic written by us.

How did it know the server already existed? Run `ls` and point out the new `terraform.tfstate` file: *"That's the tool's
memory of what it created. We'll look inside it next week."*
(See Scenario 6 in `state-and-drift.md`.)

### 3c. The change the bash script ignored

```bash
terraform plan -var instance_type=t3.small
```

**Result**: The plan says it will change the existing server's instance type: `1 to change`, not `1 to add`.
We changed the description and the tool worked out the steps. We didn't write any of the
"stop, modify, start" logic the bash script would need. Don't apply it; just compare it with Act 2c.

---

## Act 4 — Drift

### 4a. Someone "fixes" something in the console

In the AWS Console, edit the instance's tags: change `Environment` from `dev` to `prod-hotfix`.
(Or from the CLI: `aws ec2 create-tags --resources $(terraform output -raw instance_id) --tags Key=Environment,Value=prod-hotfix`)

```bash
terraform plan                   # Environment: "prod-hotfix" -> "dev"
```

Terraform detected the drift and wants to **revert it**. If that console change was a real hotfix, the next
`apply` would silently undo it. **Rule: change the code, not the console.**

```bash
terraform apply                  # reality is back in line with code
```

### 4b. Someone deletes the server

In the Console, **terminate** the instance. Wait until it shows `terminated`.

```bash
terraform plan                   # 1 to add
terraform apply
```

The code is the source of truth. Recovering from disaster here means running `apply` again.

---

## Wrap-up — Destroy

```bash
terraform destroy                # type "yes"
cd ../01-imperative && ./list-servers.sh   # should be empty
```

Teardown is one command, and it's complete, because Terraform knows exactly what it created.

### Summary table

| | ClickOps | Bash script | Terraform |
|---|---|---|---|
| Repeatable | ❌ | ✅ | ✅ |
| Reviewable in Git | ❌ | ✅ | ✅ |
| Safe to re-run (idempotent) | — | ❌ (unless you write the checks) | ✅ |
| Handles updates | manual | ❌ (write more code) | ✅ |
| Detects drift | ❌ | ❌ | ✅ |
| Clean teardown | manual | write another script | `terraform destroy` |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `VPCIdNotSpecified` / no default VPC | Use a region with a default VPC, or create one: `aws ec2 create-default-vpc` |
| `t3.micro` not available in your region/AZ | Pass `-var instance_type=t2.micro` to Terraform (and edit the bash scripts) |
| Plan unexpectedly wants to replace the server because of `ami` | AWS published a newer Amazon Linux AMI during class. That's a real-world example of why you should check plans before applying them. |
| Forgot to clean up | `./01-imperative/cleanup.sh` and `terraform destroy` in `02-declarative/`, then `./01-imperative/list-servers.sh` to confirm |
