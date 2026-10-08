# Week 2 Exercise: Refactor a Monolithic Terraform Script into a Proper Project

## What you're starting with

`main.tf` deploys a small, working set of AWS resources:

- A VPC and a single subnet
- A security group allowing SSH and HTTP
- One EC2 instance
- One S3 bucket
- One CloudWatch CPU alarm

It works, but it's written the way a beginner writes Terraform: everything hardcoded into one file, one hardcoded provider config, no variables, no environments, no reusability. Your job is to turn this into a proper, production-style Terraform project.

**You are not just reorganizing files — you also need to add missing functionality described below.** Read every requirement carefully; some of them require you to change resource blocks, not just move them.

---

## Goal

By the end, you should have a Terraform project that can deploy the **same set of resources into `dev`, `staging`, and `prod`** environments in the same AWS account, using Terraform workspaces, with environment-appropriate differences handled through conditionals and variables — not by copy-pasting the config three times.

---

## Requirements

### 1. Project structure

Split `main.tf` into a conventional multi-file layout, for example:

```
versions.tf      # terraform + provider version constraints
providers.tf      # provider configuration
variables.tf      # all input variables
main.tf           # resources
outputs.tf        # outputs
terraform.tfvars   # default variable values (or per-environment .tfvars files)
```

You can name/group files differently, but there should be a clear separation of concerns. No credentials or environment-specific values should be hardcoded inside resource blocks.

### 2. Custom provider credentials

The current provider block hardcodes the region and relies on whatever default AWS credentials happen to be on your machine. Change this so that:

- The AWS region is a variable, not a hardcoded value.
- The provider authenticates using a **named AWS CLI profile** that you pass in as a variable (i.e., not the default profile, and not hardcoded into the provider block).
- Add a `required_providers` block pinning the AWS provider to a sensible version constraint.

### 3. Workspaces

Set up and use three Terraform workspaces: `dev`, `staging`, and `prod`, all deploying into the **same AWS account**.

- Every resource that could collide by name (S3 bucket, instance tags, security group name, etc.) must be unique per workspace. Use `terraform.workspace` in naming so `terraform workspace select prod && terraform apply` doesn't clash with what's in `dev`.
- Tag every resource with its environment (derived from the workspace, not typed in manually).

### 4. Conditional resource creation

Right now every resource is created every time, regardless of environment. Change the configuration so that:

- The **CloudWatch CPU alarm** is only created when the environment is `prod`. It should not be created at all in `dev` or `staging`.
- **S3 bucket versioning** should be enabled automatically in `staging` and `prod`, but disabled in `dev`.
- The **EC2 instance type** should scale with environment — e.g. smaller in `dev`, larger in `prod` — driven by a variable/map, not hardcoded `if` copies of the resource.

Use Terraform's conditional expressions (`count`, `for_each`, or the `condition ? true_val : false_val` ternary) to achieve this — don't just comment resources in and out by hand.

### 5. Loops

Two resources need to become loop-driven instead of singular:

- **Subnets**: instead of one hardcoded subnet, create one subnet per availability zone from a list you define as a variable (e.g. 2–3 AZs). Each subnet needs a distinct CIDR block — don't hardcode three near-identical subnet blocks; derive the CIDRs programmatically (hint: look at `cidrsubnet()`).
- **EC2 instances**: instead of a single instance, allow deploying a *variable number* of web instances (`var.instance_count`), each attached to one of the subnets you created above, with a predictable, unique `Name` tag (e.g. `web-0`, `web-1`, ...).

You'll need to decide between `count` and `for_each` for each case and be able to justify the choice.

### 6. Variable validation

Add at least one `validation` block on a variable — for example, ensuring `environment` can only ever be set to `dev`, `staging`, or `prod`, and failing fast with a clear error otherwise.

### 7. Outputs

Add an `outputs.tf` that exposes at minimum:

- The VPC ID
- The IDs and public IPs of all created EC2 instances
- The S3 bucket name
- Whether the CloudWatch alarm was created in this environment

---

## Suggested workflow

1. Get the original `main.tf` running as-is (single workspace, default credentials) so you understand what it deploys. The only change you need first is to replace `CHANGE-ME` in the bucket name with something unique, because S3 bucket names are shared across every AWS account.
2. `terraform destroy` it, then start splitting files without changing behavior yet — confirm `terraform plan` shows no changes after the split.
3. Introduce variables and the custom profile, one at a time, re-running `plan` after each change.
4. Set up the three workspaces and confirm state is isolated (`terraform workspace list`, `terraform state list` per workspace).
5. Add the loops (subnets, instances) before the conditionals — it's easier to reason about conditionals once the resources are already dynamic.
6. Add the conditionals (alarm, versioning, instance sizing).
7. Add validation and outputs last, then do a full `plan`/`apply` dry run against `dev` only.

## Deliverable

A github repo with a well-structured, working Terraform project directory (not a single file) that can deploy cleanly to `dev`, `staging`, and `prod` workspaces in the same AWS account, with `terraform plan` showing sensible, environment-appropriate differences between them.

Add a well-structured README.md to the github repo explaining the working and design of the project. Make sure to make use of PRs (Pull Requests) to show the changes you made in a step by step manner.

**Do not commit your state files** (`terraform.tfstate*`) or `.tfvars` files containing personal values. State can contain sensitive data. Do commit `.terraform.lock.hcl`. Use a `.gitignore` (see the guide's Version Control section). To show what you deployed, include `terraform plan` / `terraform output` results in your README or PR descriptions instead.

## Submitting your work for review

   Use Pull Requests (PRs) to present your changes incrementally. Follow this branching strategy:

   ```
   feature/name-of-the-feature -> review -> main
   ```

   - Create a **feature branch** for each piece of work (e.g. `feature/split-files`, `feature/workspaces`, `feature/subnet-loop`).
   - When a feature is complete, merge it into a **`review`** branch.
   - Once you're ready for feedback, open a PR from `review` → `main` and request a review.
   - Reviews will be provided as comments on that PR. You can address feedback on new fix/feature branches, merge them into the open PR, and request another round of review — or merge directly to `main` if you prefer.

   When submitting, provide links to your PRs so the progression of changes is easy to follow.