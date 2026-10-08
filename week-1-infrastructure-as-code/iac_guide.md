# Infrastructure as Code (IaC): A Comprehensive Guide

## Introduction

Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure (servers, networks, databases, load balancers, DNS records, permissions) through machine-readable configuration files instead of manual processes, point-and-click consoles, or one-off scripts. Those files can be versioned, reviewed, tested, and automated just like application code.

IaC brings the rigor of software engineering — version control, peer review, automated testing, and continuous integration — directly to infrastructure management. The result is infrastructure that is more reliable, reproducible, and easier to change safely.

## The Problem IaC Solves: "ClickOps"

Imagine your team runs an application on AWS. Over two years, different engineers have created servers, opened firewall ports, attached disks, and tweaked settings through the AWS Console. Now answer these questions:

- **What exactly is running in production right now, and why?** Nobody is quite sure. The engineer who set up the database left last year.
- **Can you create an identical staging environment?** Only by clicking through hundreds of screens and hoping you remember every setting.
- **The region goes down. How long to rebuild everything somewhere else?** Days, maybe weeks.
- **Who opened port 22 to the whole internet last Tuesday?** You'd have to dig through audit logs, if they're even enabled.

This style of manual, console-driven infrastructure management is often called **ClickOps**. It works for experiments and learning, but it doesn't scale, it isn't repeatable, and it leaves no reviewable history.

IaC answers all four questions: the code *is* the documentation, the same code builds staging and production, rebuilding is a single command, and Git history shows who changed what and why.

## Why Infrastructure as Code?

### Core Benefits

**Consistency and Repeatability**: Every environment is built from the same definitions, so dev, staging, and production stop drifting apart. This eliminates the infrastructure version of "works on my machine".

**Speed and Efficiency**: Manual provisioning can take days. IaC reduces this to minutes. A complete multi-tier application with networking, databases, and load balancers can be provisioned with a single command.

**Version Control and Auditability**: Infrastructure definitions stored in Git provide a complete audit trail of who changed what, when, and why. This enables rollbacks, code review, and compliance reporting.

**Scalability and Replication**: Need the same stack in another region, or for another customer? Parameterize the code and run it again.

**Enhanced Collaboration**: Infrastructure becomes reviewable code. Developers, operations, and security teams can discuss and approve changes through pull requests, the same way they review application code.

**Disaster Recovery**: If infrastructure is defined in code, recovering from a lost account or region becomes "re-run the code" instead of "try to remember what we built".

**Cost Control**: Environments can be torn down when not in use (e.g. test environments at night) and recreated on demand. Nothing is forgotten and left running, because everything is accounted for in code.

### What This Looks Like in Practice

Teams that adopt IaC typically report:
- Environments that take minutes rather than days to provision
- Fewer incidents caused by inconsistent or undocumented configuration
- Faster, more confident disaster recovery
- Easier security and compliance audits (the code shows exactly what exists)
- Faster onboarding — new engineers read the code to learn the infrastructure

## Core Concepts

### Declarative vs Imperative Approaches

**Imperative** means you describe *how*: the exact sequence of steps and commands to run. You are responsible for checking what already exists, ordering the steps correctly, and handling errors.

*Example*: "Create a security group. Then launch two servers. Then create a load balancer. Then attach the servers."

```bash
#!/usr/bin/env bash
# Imperative: a script of steps using the AWS CLI.
# Run this twice and you get FOUR servers and an error on the security group.
SG_ID=$(aws ec2 create-security-group --group-name web-sg \
  --description "web" --query GroupId --output text)

aws ec2 run-instances --image-id ami-12345678 --instance-type t3.micro \
  --count 2 --security-group-ids "$SG_ID"
```

**Declarative** means you describe *what*: the desired end state. The IaC tool compares that desired state with what currently exists and works out the steps (create, update, or delete) needed to get there.

*Example*: "I want a load balancer with two web servers behind it."

```hcl
# Terraform: describe the end state, not the steps.
# Run this twice and you still have exactly two servers.
resource "aws_lb" "example" {
  name               = "web-lb"
  load_balancer_type = "application"
  subnets            = var.subnet_ids
}

resource "aws_instance" "web" {
  count         = 2
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

**A useful analogy**: Imperative is giving a taxi driver turn-by-turn directions. Declarative is giving them the destination address and letting them figure out the route — including noticing that you're already halfway there.

**Choosing Between Them**: Declarative tools are generally preferred for *provisioning* infrastructure because they are predictable, handle dependencies automatically, and know how to update or delete what they created. Imperative/procedural approaches still have their place in *configuration* and orchestration tasks (e.g. "run this database migration, then restart the service").

> **Note on Ansible**: Ansible playbooks run tasks in order (procedural), but most Ansible modules are themselves declarative and idempotent ("ensure this package is installed"). It's best described as a procedural tool built from declarative building blocks — which is why it's commonly used for configuration management rather than provisioning.

### Idempotency

Idempotency is the property that running the same operation multiple times produces the same result as running it once. This is the single most important property for safe automation.

**Non-idempotent**: `aws ec2 run-instances --count 1` — every run creates *another* server. Run it five times, get five servers (and five bills).

**Idempotent**: A Terraform resource declaring one server — the first run creates it; every later run checks reality, sees it already exists, and does nothing.

Why it matters:
- **Safe to retry**: If a deployment fails halfway, you just run it again.
- **Safe to automate**: Pipelines can apply infrastructure code on every merge without fear of duplication.
- **Self-correcting**: If someone changes something by hand, re-running the code puts it back.

You *can* make imperative scripts idempotent ("check if the server exists first, and only create it if not"), but you quickly end up writing lots of checking logic for creates, updates, *and* deletes — essentially re-inventing a declarative tool, badly.

### Mutable vs Immutable Infrastructure

**Mutable Infrastructure** treats servers like *pets*: they have names, they're patched and updated in place, and they're nursed back to health when sick. This is familiar, but each server slowly accumulates unique changes (configuration drift), and problems become hard to reproduce.

**Immutable Infrastructure** treats servers like *cattle*: when a change is needed, a brand new instance is built from a known-good image, and the old one is replaced. Nothing is modified after deployment. This eliminates drift and makes rollbacks simple (switch back to the previous image), but requires applications to keep important data outside the server (databases, object storage).

**Hybrid Approaches** are common in practice. The underlying infrastructure (VMs, container images) is immutable, while some settings (tags, scaling limits, feature flags) are updated in place. Containers and Kubernetes — later in this course — push heavily toward immutability.

You'll see this distinction directly in Terraform: some changes are applied **in place** (`~ update in-place`), while others **force replacement** (`-/+ destroy and then create replacement`).

### State

Declarative tools need to remember what they've created so they can compare it with your code and with reality. This record is called **state**. In Terraform it lives in a file called `terraform.tfstate`.

State maps the names in your code (`aws_instance.web`) to real-world IDs (`i-0abc123...`) and stores the last known attributes of each resource. Because it's so central, state must be:

- **Shared** among team members (so everyone works from the same picture)
- **Locked** during changes (so two people can't apply at the same time and corrupt it)
- **Backed up / versioned** (so it can be recovered)
- **Secured** (it frequently contains sensitive values such as passwords and connection strings)

See [state-and-drift.md](./state-and-drift.md) for a walkthrough of how code, state, and reality relate.

### Configuration Drift

**Drift** is when the real infrastructure no longer matches what's defined in code — usually because someone made a "quick fix" in the console, or an external process changed something.

Drift is dangerous because:
- The code no longer tells the truth about what's running
- The next deployment may silently undo the manual fix (or fail unexpectedly)
- Environments that were identical quietly diverge

Declarative tools can **detect** drift (e.g. `terraform plan` shows differences between code and reality) and **correct** it (`terraform apply` puts reality back in line with the code). The cultural rule that makes IaC work: **once infrastructure is managed by code, changes go through the code** — not the console.

## The IaC Tool Landscape

### Provisioning vs Configuration Management

It's important to distinguish between two jobs:

- **Infrastructure provisioning**: creating the infrastructure itself — VMs, networks, storage, databases, IAM roles
- **Configuration management**: setting up what runs *on* that infrastructure — installing packages, writing config files, managing services

| Category | Tools |
|---|---|
| Provisioning (multi-cloud) | Terraform, OpenTofu, Pulumi, Crossplane |
| Provisioning (cloud-specific) | AWS CloudFormation, AWS CDK, AWS SAM, Azure Bicep / ARM, Google Cloud Infrastructure Manager |
| Configuration management | Ansible, Chef, Puppet, SaltStack |

In modern cloud-native setups, configuration management is used less than it used to be: container images (Week 3) and Kubernetes manifests (Weeks 4–5) bake configuration in at build time instead of applying it to running servers.

### General Purpose Tools

#### Terraform
**Strengths**: Cloud-agnostic, enormous provider ecosystem (thousands of providers on the Terraform Registry covering clouds, SaaS products, DNS, monitoring, etc.), mature state management, large community, declarative HCL syntax.

**Use Cases**: Multi-cloud deployments, complex infrastructure with many dependencies, teams wanting one workflow across many platforms.

**Licensing & ownership**: In August 2023 HashiCorp changed Terraform's license from the open-source MPL 2.0 to the Business Source License (BSL), which restricts building competing products with it. IBM completed its acquisition of HashiCorp in February 2025. For learners and most companies using Terraform internally, nothing changes in practice. HashiCorp's managed service, formerly *Terraform Cloud*, is now called **HCP Terraform**.

This is the tool we'll use in Week 2.

**Example**: Creating a complete VPC with subnets using a community module:

```hcl
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false
}
```

#### OpenTofu
**What it is**: A community fork of Terraform, created in response to the license change and now governed by the Linux Foundation (a CNCF project since 2025). It remains open source under MPL 2.0.

**Strengths**: Drop-in compatible with Terraform for most projects (same HCL, same providers, same workflow — the CLI is `tofu` instead of `terraform`), plus a few features of its own such as built-in state encryption.

**Use Cases**: Organizations that require a truly open-source license or want vendor neutrality.

Everything you learn about Terraform in this course applies to OpenTofu.

#### Pulumi
**Strengths**: Define infrastructure in general-purpose programming languages (Python, TypeScript, Go, C#, Java), so you get loops, functions, classes, type checking, IDE autocomplete, and normal unit-testing frameworks.

**Use Cases**: Teams with strong programming backgrounds, infrastructure with complex logic, building reusable internal platforms.

**Example**: Creating AWS resources with Python:

```python
import pulumi
import pulumi_aws as aws

# Create a VPC
vpc = aws.ec2.Vpc("main-vpc",
    cidr_block="10.0.0.0/16",
    tags={"Name": "Main VPC"})

# Create an Internet Gateway attached to the VPC
igw = aws.ec2.InternetGateway("main-igw",
    vpc_id=vpc.id,
    tags={"Name": "Main IGW"})

# Export the VPC ID so other stacks/tools can use it
pulumi.export("vpc_id", vpc.id)
```

Note that even though this is Python, it's still **declarative**: you describe the resources you want, and Pulumi's engine works out what to create, update, or delete.

#### Crossplane
**What it is**: A CNCF project that turns a Kubernetes cluster into a control plane for cloud infrastructure. You declare an S3 bucket or a database as a Kubernetes resource (YAML), and Crossplane continuously reconciles the cloud to match.

**Use Cases**: Platform teams that already run Kubernetes and want infrastructure managed the same way as applications. Worth revisiting after Weeks 4–5.

> **What happened to CDK for Terraform (CDKTF)?** CDKTF let you write Terraform configurations in TypeScript/Python. HashiCorp deprecated it and archived the project in December 2025. If you want "infrastructure in a programming language", use Pulumi or AWS CDK instead; if you want Terraform's ecosystem, write HCL.

### Cloud-Specific Tools

#### AWS CloudFormation
**Strengths**: Deep AWS integration, AWS manages the state for you (no state file to look after), automatic rollback on failure, no additional cost.

**Use Cases**: AWS-only environments, organizations that prefer native tooling.

**Example**: An S3 bucket with versioning, encryption, and public access blocked:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'S3 bucket with versioning and encryption'

Parameters:
  BucketName:
    Type: String
    Default: my-secure-bucket
    Description: Name of the S3 bucket

Resources:
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "${BucketName}-${AWS::AccountId}"
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

Outputs:
  BucketName:
    Description: Name of the created S3 bucket
    Value: !Ref S3Bucket
    Export:
      Name: !Sub "${AWS::StackName}-BucketName"
```

#### AWS CDK & AWS SAM

**AWS CDK (Cloud Development Kit)** lets you define AWS infrastructure in TypeScript, Python, Java, C#, or Go. Your code is "synthesized" into CloudFormation templates, which CloudFormation then deploys. CDK provides high-level building blocks ("constructs") — e.g. one line can create a load-balanced container service with sensible defaults.

**AWS SAM (Serverless Application Model)** is a CloudFormation extension with shorthand syntax for serverless applications (Lambda functions, API Gateway, DynamoDB tables), plus a CLI for building and testing them locally.

**Use Cases**: AWS-only teams; CDK for developers who prefer real programming languages; SAM for serverless-focused projects.

#### Azure Bicep & ARM Templates
**ARM (Azure Resource Manager) templates** are Azure's native JSON-based IaC format — powerful but verbose. **Bicep** is a cleaner, domain-specific language that compiles down to ARM templates and is now Microsoft's recommended way to write native Azure IaC. Like CloudFormation, Azure tracks state for you.

```bicep
param location string = resourceGroup().location

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'mystorage${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}
```

#### Google Cloud Infrastructure Manager
Google's native offering is **Infrastructure Manager**, a managed service that runs Terraform configurations for you on Google Cloud. It replaced the older *Cloud Deployment Manager*, which reached end of support in March 2026 — another sign of how much of the industry has standardized on Terraform/HCL.

### How to Choose

| If you... | Consider |
|---|---|
| Work across multiple clouds or SaaS tools | Terraform / OpenTofu |
| Are AWS-only and want zero state management | CloudFormation (or CDK on top of it) |
| Are Azure-only | Bicep |
| Prefer real programming languages | Pulumi, AWS CDK |
| Already run everything on Kubernetes | Crossplane |
| Need to configure software on existing servers | Ansible |

When in doubt, Terraform/OpenTofu is the most widely used and most transferable skill — which is why the rest of this course uses it.

## The IaC Lifecycle

### 1. Planning and Design
- **Requirements Gathering**: Understand performance, security, compliance, and cost requirements
- **Architecture Design**: Create high-level diagrams and choose tools
- **Module Planning**: Identify reusable components and design their inputs/outputs

### 2. Development
- **Code Organization**: Structure code into logical modules and environments
- **Local Validation**: Formatting, validation, linting, and previewing changes (`terraform fmt`, `terraform validate`, `terraform plan`)
- **Documentation**: Document module inputs, outputs, and usage examples

### 3. Testing and Validation
- **Syntax Testing**: Automated checks of code syntax and formatting
- **Static Analysis**: Security scanning, policy checks, and cost estimation *before* anything is deployed
- **Integration Testing**: Deploy to a test environment and verify that it works (`terraform test` provides a built-in framework for this)
- **Policy Testing**: Ensure resources comply with organizational rules (e.g. "all buckets must be encrypted")

### 4. Deployment and Operations
- **Review the Plan**: Every change is previewed and reviewed before it's applied
- **Staged Rollouts**: Promote changes through development → staging → production
- **Monitoring**: Track resource health, cost, and drift

### 5. Lifecycle Management
- **Change Management**: All changes go through pull requests and pipelines — not the console
- **Disaster Recovery**: Periodically prove you can rebuild from code
- **Decommissioning**: Remove resources by removing them from code (or destroying the stack), so state stays accurate

## Best Practices

### Code Organization and Modularity

**Module Design Principles**:
- Single responsibility: each module should have one clear purpose (e.g. "network", "database")
- Composability: modules should work well together through clear inputs and outputs
- Parameterization: use variables so the same module works for dev and prod
- Documentation: a README with usage examples for every module

**Directory Structure Example**:
```
infrastructure/
├── modules/          # Reusable building blocks
│   ├── vpc/
│   ├── database/
│   └── compute/
├── environments/     # One folder (and one state file) per environment
│   ├── dev/
│   ├── staging/
│   └── prod/
└── global/           # Account-wide resources (IAM, DNS zones)
    └── iam/
```

### Never Hardcode Secrets

- Never put passwords, API keys, or access keys in `.tf` files or commit them to Git
- Use a secret manager (AWS Secrets Manager, SSM Parameter Store, Azure Key Vault, HashiCorp Vault) and reference secrets at deploy time
- Mark sensitive variables and outputs as `sensitive = true` so they aren't printed in logs
- Prefer short-lived credentials (e.g. OIDC from GitHub Actions to AWS) over long-lived access keys in CI/CD
- Add `*.tfstate` and `*.tfvars` to `.gitignore`

### State Management Strategies

**Remote State Backends**:
- AWS S3 with **native S3 locking** (`use_lockfile = true`, Terraform ≥ 1.10). Earlier tutorials use a DynamoDB table for locking — that method is now deprecated.
- Azure Storage (blob lease locking)
- Google Cloud Storage (built-in locking)
- HCP Terraform / other managed IaC platforms (Spacelift, env0, Scalr)

```hcl
terraform {
  backend "s3" {
    bucket       = "my-company-terraform-state"
    key          = "prod/network/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true # S3-native locking, no DynamoDB table needed
  }
}
```

**State File Security**:
- Encrypt state at rest and in transit
- Restrict access with IAM — state can contain secrets
- Use separate state files per environment (so a mistake in dev can't touch prod)
- Enable bucket versioning so you can recover a previous state

### CI/CD Integration

**Pipeline Stages**:
1. **Validate**: formatting, syntax, linting, security scanning
2. **Plan**: generate the execution plan and post it on the pull request for review
3. **Apply**: deploy only after the change is reviewed and merged
4. **Verify**: check that the deployed infrastructure works
5. **Notify**: tell the team what changed

**Pipeline Example (GitHub Actions)**:
```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  id-token: write     # Allows OIDC login to AWS — no long-lived keys stored in GitHub
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: hashicorp/setup-terraform@v3
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: terraform init
      - run: terraform fmt -check
      - run: terraform validate
      - run: terraform plan -out=tfplan
      - run: terraform apply -auto-approve tfplan
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

Pull requests only *plan*; merging to `main` *applies*. This is covered properly in Weeks 6–7.

### Security, Policy, and Cost — "Shift Left"

Catching problems in code is far cheaper than catching them in production (more on this in Week 8):

- **Security scanning**: Checkov, Trivy (which absorbed the older *tfsec* project), KICS — flag things like public buckets or unencrypted disks before deployment
- **Policy as code**: Open Policy Agent (OPA) / Conftest, HashiCorp Sentinel — enforce organizational rules automatically
- **Cost estimation**: Infracost — shows the monthly cost impact of a change right in the pull request
- **Linting**: TFLint — catches provider-specific mistakes like invalid instance types

## Troubleshooting and Operations

### Common Issues and Solutions

**State Problems** (corrupted, lost, or locked state):
- Keep state in a versioned remote backend so you can roll back
- If a lock is stuck after a crashed run, release it carefully (`terraform force-unlock`) — only after confirming nobody else is applying
- Never hand-edit state files; use `terraform state` commands

**Drift**:
- Run `terraform plan` regularly (or on a schedule in CI) to detect drift
- Decide per case: bring the code in line with reality (update code / `terraform import`), or bring reality in line with the code (`terraform apply`)

**Dependency Problems**:
- Let references between resources express dependencies (`subnet_id = aws_subnet.main.id`)
- Use explicit `depends_on` only when a dependency can't be expressed through references
- Break circular dependencies by restructuring resources

**Provider Limitations**:
- Pin provider versions and read the changelog before upgrading
- Check the provider's issue tracker for known bugs and workarounds

### Monitoring

**Infrastructure Health**: resource utilization, alerts on anomalies, cost tracking.

**IaC Process Health**: pipeline success rate, deployment frequency, time from PR to production, and amount of drift detected.

## Current Trends

**AI-Assisted IaC**: LLM-based assistants can now write and explain Terraform, and tools such as HashiCorp's Terraform MCP server give AI agents up-to-date provider documentation. This makes reading and reviewing plans *more* important, not less: AI-generated infrastructure code must go through the same plan review, scanning, and policy checks as human-written code.

**Platform Engineering**: Platform teams wrap IaC modules in self-service portals (e.g. Backstage) so developers can request a database or environment without writing Terraform themselves.

**Policy as Code & Drift Detection** are becoming standard features of IaC platforms rather than add-ons.

**Open Source Governance**: The Terraform/OpenTofu split means teams now consciously choose a tool based on licensing and governance, not just features.

## Conclusion

Infrastructure as Code changes infrastructure from something people *do* (clicking, running commands) into something people *write, review, and version*. The key ideas to carry into the rest of this course are:

1. **Declarative** tools describe the desired end state; the tool works out the steps.
2. **Idempotency** means running the code again is safe — it only changes what's different.
3. **State** is how the tool remembers what it created; protect it.
4. **Drift** happens when reality diverges from code; the cure is discipline — change the code, not the console.
5. **Immutable** infrastructure replaces instead of patching, which keeps environments predictable.

Next week, we put these ideas into practice with Terraform.

## Glossary

| Term | Meaning |
|---|---|
| ClickOps | Managing infrastructure manually through a web console |
| Declarative | Describing the desired end state |
| Imperative | Describing the exact steps to take |
| Idempotent | Running it again produces the same result |
| State | The tool's record of what it created and how it maps to real resources |
| Drift | Differences between real infrastructure and what's defined in code |
| Provider | A plugin that lets an IaC tool talk to a specific API (AWS, Azure, GitHub, ...) |
| Module | A reusable, parameterized group of resources |
| Plan | A preview of the changes a tool will make before it makes them |
| Mutable / Immutable | Updating resources in place vs replacing them with new ones |

## Check Your Understanding

1. You run a Bash script that calls `aws ec2 run-instances` three times. How many instances do you have? What would happen with a Terraform configuration declaring one instance, applied three times?
2. A colleague changes a security group rule in the AWS Console to fix an outage. What problems might this cause the next time someone runs `terraform apply`? What should they have done instead?
3. Why must state files never be committed to a public Git repository?
4. Give one example where you'd choose Ansible over Terraform, and one where you'd choose Terraform over Ansible.
5. What's the difference between an `~ update in-place` change and a `-/+ replace` change? Why does it matter for a production database?
6. Your company is AWS-only and doesn't want to manage state files. Which tool might suit them, and what would they give up compared to Terraform?

## Further Reading

- [Terraform: What is Infrastructure as Code?](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/infrastructure-as-code)
- [OpenTofu documentation](https://opentofu.org/docs/)
- [Pulumi: What is Infrastructure as Code?](https://www.pulumi.com/what-is/what-is-infrastructure-as-code/)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
- [Terraform S3 backend (native state locking)](https://developer.hashicorp.com/terraform/language/backend/s3)
- *Terraform: Up & Running* by Yevgeniy Brikman — chapter 1 is an excellent introduction to IaC concepts
