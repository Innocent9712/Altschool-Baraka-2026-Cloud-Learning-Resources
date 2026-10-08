# Terraform Hands-On Demo Guide

This directory contains a fully working, simple AWS deployment for demonstrating the core concepts of Terraform:
providers, resources, variables, data sources, outputs, state, and modules.

It's built up **step by step by uncommenting sections** in `main.tf` and `outputs.tf`. After each change, run the
CLI and talk through the output.

Last week we treated Terraform as a black box and only looked at how it *behaves*: it's idempotent, it detects
drift, and it recreates deleted resources. This week we open the box and look at how it works.

**Cost**: low (one small EC2 instance, a VPC, and a few S3 buckets). **Destroy everything at the end.**

---

## Prerequisites
1. **Terraform CLI**: v1.10.0 or later (required for S3 native state locking). Check with `terraform version`.
2. **AWS CLI**: configured with credentials that can create VPC, EC2, and S3 resources:
   ```bash
   aws configure
   aws sts get-caller-identity   # confirms which account you're using
   ```

## Project Files

| File | Purpose |
|---|---|
| `providers.tf` | Terraform and provider version constraints, provider configuration, default tags |
| `variables.tf` | Input variables, defaults, and `validation` rules |
| `terraform.tfvars.example` | Example variable values. Copy it to `terraform.tfvars` |
| `locals.tf` | Computed values reused across the project (name prefix, tags, subnet CIDR) |
| `datasources.tf` | Read-only lookups: latest Ubuntu AMI, availability zones, account ID |
| `main.tf` | The resources, in four sections that you uncomment one at a time |
| `outputs.tf` | Values printed after apply |
| `backend.tf` | Remote state configuration (commented out until Step 2) |
| `user_data.sh` | Startup script for the web server, rendered with `templatefile()` |
| `modules/s3-bucket/` | A small local module used in Step 5 |
| `.terraform.lock.hcl` | Records the exact provider versions used. **Commit this file.** |

---

## Step 1: Providers, Variables, & Local State
By default, the S3 backend configuration in `backend.tf` is commented out, so Terraform uses **local state**.

1. **Create your variables file**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Explain the project structure** (see the table above):
   - `providers.tf`: Terraform is pluggable. Providers are downloaded plugins. Explain the version constraint `~> 6.0`, and that `default_tags` tags every resource automatically.
   - `variables.tf`: input variables, default values, the `validation` rule on `instance_type`, and variable precedence.
   - `locals.tf`: computed private values vs input variables (showing functions like `cidrsubnet()`).
   - `datasources.tf`: querying existing information (the latest Ubuntu AMI and the available AZs).
   - `main.tf`: the resources themselves. Currently only **Section 1: Networking** is uncommented.

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```
   Show the new `.terraform/` folder (downloaded plugins, never committed) and `.terraform.lock.hcl` (exact provider versions and checksums, always committed, like `package-lock.json`).

4. **Format & Validate**:
   ```bash
   terraform fmt
   terraform validate
   ```
   `fmt` enforces the standard style. `validate` checks syntax and references without calling AWS.

   Optional: set `environment = "test"` in `terraform.tfvars` and run `terraform validate` to see the validation rule fail. Then change it back.

5. **Review the plan**:
   ```bash
   terraform plan
   ```
   Point out:
   - `+` means a resource will be created.
   - The data sources (AMI, AZs, account ID) aren't in the list. They were already read while the plan was being built.
   - `(known after apply)`: values like `id` and `arn` are assigned by AWS during creation.
   - References such as `vpc_id = aws_vpc.main.id` tell Terraform the order it needs to create things in.
   - The summary line: `Plan: 5 to add, 0 to change, 0 to destroy.`

6. **Deploy the networking stack**:
   ```bash
   terraform apply
   ```
   Look at the prompt, then type `yes` to confirm.

7. **Inspect local state**:
   - Point out that a `terraform.tfstate` file has appeared. Open it to show how Terraform maps your configuration to real resources (for example, the VPC ID).
   - Query the state with commands instead of reading the file directly:
     ```bash
     terraform state list
     terraform state show aws_vpc.main
     terraform output
     ```
   - Ask: *"This file is on my laptop. What happens if a teammate runs `apply` from their laptop?"* That question leads into Step 2.

---

## Step 2: State Migration (Local to Remote S3)
To move from local to remote state using **S3 native locking** (no DynamoDB table needed), first create a bucket for the state.
The state bucket is created *outside* this Terraform project. Otherwise `terraform destroy` would delete the bucket that holds its own state.

### 1. Create the S3 bucket with the AWS CLI
Replace `YOUR-UNIQUE-BUCKET-NAME` with a globally unique name (e.g. `tf-state-yourname-12345`).

**Create the bucket (us-east-1)**:
```bash
aws s3api create-bucket \
  --bucket YOUR-UNIQUE-BUCKET-NAME \
  --region us-east-1
```
*(For any region other than `us-east-1`, add `--create-bucket-configuration LocationConstraint=your-region`.)*

**Enable versioning** (strongly recommended, because it lets you recover a previous version of your state):
```bash
aws s3api put-bucket-versioning \
  --bucket YOUR-UNIQUE-BUCKET-NAME \
  --versioning-configuration Status=Enabled
```

**Encryption and public access blocking**: new S3 buckets are encrypted (SSE-S3) and block public access by default.
Setting both explicitly documents the intent and protects against changed account defaults:
```bash
aws s3api put-bucket-encryption \
  --bucket YOUR-UNIQUE-BUCKET-NAME \
  --server-side-encryption-configuration '{
    "Rules": [
      {"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}
    ]
  }'

aws s3api put-public-access-block \
  --bucket YOUR-UNIQUE-BUCKET-NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 2. Migrate the state file
1. Open `backend.tf` and **uncomment** the `terraform` block.
2. Replace `your-unique-terraform-state-bucket` with the name of the bucket you just created.
3. Run `terraform init`. Terraform detects the backend change and offers to copy your existing local state to S3:
   ```
   Do you want to copy existing state to the new backend?
     Pre-existing state was found while migrating the previous "local" backend to the
     newly configured "s3" backend. No existing state was found in the "s3" backend.
     Do you want to copy this state to the new "s3" backend? Enter "yes" to copy and "no"
     to start with an empty state.
   ```
4. Type `yes`.
5. Inspect the directory. The local `terraform.tfstate` is now empty; the real state lives in S3. Show it in the S3 console.
6. Run `terraform plan` to confirm that everything is in sync and no changes are needed.
7. Optional: start a `terraform apply` and leave it at the prompt. In a second terminal, run `terraform plan` and watch it fail to acquire the state lock. That's locking at work. Answer `no` in the first terminal.

---

## Step 3: Add Security Group & Compute (Iterative Development)
This step shows how Terraform handles adding new resources and the dependencies between them.

1. **Uncomment Section 2 (Security Group)** in `main.tf`.
2. Run `terraform plan`. Terraform will create exactly **1** resource (the security group) and leave the existing VPC and subnet untouched.
3. **Uncomment Section 3 (Compute)** in `main.tf`.
4. **Uncomment the security group and EC2 outputs** in `outputs.tf`.
5. Run `terraform plan`. Explain the dependency graph:
   - The instance references `aws_subnet.main.id` and `aws_security_group.web.id`, so Terraform creates those first.
   - These are **implicit dependencies**. `depends_on` is only needed when there's no reference to express the relationship.
   - `templatefile()` renders `user_data.sh` with values from Terraform (look for `${project_name}` in the script).
6. Apply it:
   ```bash
   terraform apply
   ```
7. Open the `web_server_url` output in a browser. Wait a minute or two for the startup script to install Nginx.

---

## Step 4: Update-In-Place vs Re-Creation
This step shows that changing different arguments affects resources in different ways. **Read the plan symbols carefully.**

1. **Update-in-place**:
   - In `terraform.tfvars`, change `instance_type = "t3.micro"` to `instance_type = "t3.small"`.
   - Run `terraform plan`. The `~` symbol means **update in-place**: the same instance is modified (AWS stops it, resizes it, and starts it again). Its ID doesn't change.
   - Optionally apply it, then set it back.
2. **Re-creation (forced replacement)**:
   - In `terraform.tfvars`, uncomment `vpc_cidr` and change it to `"10.1.0.0/16"`.
   - Run `terraform plan`. Look for `-/+` and `# forces replacement`. A VPC's CIDR block can't be changed, so Terraform must destroy the VPC and rebuild it.
   - Look at the **blast radius**: the subnet, route table, security group, and EC2 instance all have to be replaced too, because they live inside the VPC.
   - **Discard this change before applying.** In real life, always check plans for `forces replacement`. Replacing a database means losing its data.

---

## Step 5: Modules (Local & Remote)
This step shows how to reuse configuration with a local module and a module from the public registry.

1. Walk through `modules/s3-bucket/`. It has its own `variables.tf` (inputs), `main.tf` (resources), and `outputs.tf` (return values), just like a function.
2. **Uncomment Section 4 (Modules)** in `main.tf`. The local module is called **twice** with different inputs. That's the reuse.
3. **Uncomment the Section 4 outputs** in `outputs.tf`.
4. **Run `terraform plan` immediately.** It fails with `Module not installed`.
   - Terraform must download the registry module into `.terraform/modules` first, and register the local modules.
5. **Re-initialize to install modules**:
   ```bash
   terraform init
   ```
   The output shows `terraform-aws-modules/security-group/aws` being downloaded from the registry.
6. **Run `terraform plan`**:
   - It will create a `random_id`, two buckets from the local module, and a security group from the remote module.
   - Show how inputs are passed in (`bucket_name`, `versioning_enabled`) and how outputs come back (`module.assets_bucket.bucket_id`).
   - Notice the addresses in the plan: `module.assets_bucket.aws_s3_bucket.this`.
7. **Apply the changes**:
   ```bash
   terraform apply
   ```

---

## Step 6: Destruction
This step shows how cleanup works.

1. Run `terraform destroy`:
   ```bash
   terraform destroy
   ```
2. Type `yes` to confirm. Watch Terraform delete everything in **reverse dependency order**, including the resources created by modules.
3. Delete the state bucket, which Terraform doesn't manage. Because versioning is on, every version has to be deleted before the bucket can be:
   ```bash
   BUCKET=YOUR-UNIQUE-BUCKET-NAME
   aws s3api delete-objects --bucket "$BUCKET" --delete "$(aws s3api list-object-versions --bucket "$BUCKET" \
     --query '{Objects: [Versions, DeleteMarkers][].{Key: Key, VersionId: VersionId}}' --output json)"
   aws s3api delete-bucket --bucket "$BUCKET" --region us-east-1
   ```
   *(Alternatively, in the S3 console: select the bucket → **Empty** → then **Delete**.)*
4. Re-comment `backend.tf` and the sections in `main.tf`/`outputs.tf` if you want to run the demo again from the start.
