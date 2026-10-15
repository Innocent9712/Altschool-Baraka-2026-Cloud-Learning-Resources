# A Complete Guide to Terraform

This guide serves as a comprehensive reference for our class on Terraform. It is designed to be a concise yet complete document you can follow along with and use for self-study afterward. We'll cover everything from the foundational principles to advanced, real-world concepts.

---

## Table of Contents
1. [Foundations: What is IaC & Why Terraform?](#foundations-what-is-iac--why-terraform)
2. [Installation and Setup](#installation-and-setup)
3. [Core Terraform Concepts](#core-terraform-concepts)
4. [The Standard Terraform Workflow](#the-standard-terraform-workflow)
5. [Hands-On Example: Your First Infrastructure](#hands-on-example-your-first-infrastructure)
6. [Managing Complexity with Modules](#managing-complexity-with-modules)
7. [Understanding Terraform State](#understanding-terraform-state)
8. [Best Practices](#best-practices)
9. [Advanced Concepts](#advanced-concepts)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)
11. [Next Steps and Resources](#next-steps-and-resources)

---

## Foundations: What is IaC & Why Terraform?

### Quick Recap from Week 1

Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure using machine-readable definition files, rather than manual processes or interactive tools. Last week we saw that a declarative tool:

- Describes the **desired end state**, not the steps (*declarative*, not *imperative*)
- Can be run repeatedly with the same result (*idempotent*)
- Keeps a record of what it created (*state*)
- Detects and corrects changes made outside of it (*drift*)

**Terraform is a declarative IaC tool.** This week we learn how it actually works.

### Why Terraform?

* **Platform Agnostic:** Manage infrastructure across multiple cloud providers (AWS, Azure, GCP) and other services (Kubernetes, GitHub, Cloudflare, Datadog) with a single tool and a single workflow.
* **State Management:** Terraform keeps a `state file`, a record of the infrastructure it manages. This lets Terraform know what to create, update, or destroy.
* **Declarative Syntax:** You describe *what* you want, not *how* to create it, making configurations easier to read and maintain.
* **Planning & Safety:** The `terraform plan` command provides a "dry run" that shows you exactly what changes will be made before you apply them.
* **Large Ecosystem:** Thousands of providers and modules on the [Terraform Registry](https://registry.terraform.io/).
* **Free to use:** The Terraform CLI is free. Since August 2023 it is licensed under the Business Source License (BSL) rather than an open-source license. For learning and for using it within your company, that changes nothing.

### Terraform and OpenTofu

**OpenTofu** is an open-source fork of Terraform maintained under the Linux Foundation. For the material in this course it is a drop-in replacement: same HCL language, same providers, same workflow. Replace `terraform` with `tofu` on the command line. Everything in this guide applies to both.

### Terraform vs Other Tools

| Tool | Type | Best For |
|------|------|----------|
| Terraform / OpenTofu | Declarative | Multi-cloud infrastructure provisioning |
| AWS CloudFormation / CDK | Declarative | AWS-only environments |
| Pulumi | Declarative (in general-purpose languages) | Developers preferring Python/TypeScript/Go |
| Ansible | Procedural / Config Mgmt | Configuring software on existing servers |

---

## Installation and Setup

### Installing Terraform

#### Option 1: Package Manager (Recommended)

**macOS (Homebrew):**
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Windows (winget or Chocolatey):**
```powershell
winget install Hashicorp.Terraform
# or
choco install terraform
```

**Ubuntu/Debian:**
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

> **Managing multiple versions**: tools like [`tfenv`](https://github.com/tfutils/tfenv) or [`tenv`](https://github.com/tofuutils/tenv) let you switch Terraform versions per project.

#### Option 2: Manual Installation

1. Go to the official [Terraform install page](https://developer.hashicorp.com/terraform/install)
2. Download the package for your operating system and unzip it
3. Move the `terraform` executable to a directory in your system's `PATH`

### Verify Installation

```bash
terraform --version
```

You should see output like (your version will likely be newer):
```
Terraform v1.15.5
on darwin_arm64
```

### Setting Up Cloud Provider Credentials

#### AWS Setup
```bash
# Install AWS CLI and configure
aws configure
# Or set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# Confirm which account and identity Terraform will use
aws sts get-caller-identity
```

Terraform's AWS provider finds credentials the same way the AWS CLI does, so **never put access keys in your `.tf` files**. In organizations, prefer short-lived credentials such as IAM Identity Center (`aws configure sso`) over long-lived access keys.

#### Azure Setup
```bash
# Install Azure CLI and login
az login
```

#### Google Cloud Setup
```bash
# Install gcloud CLI and authenticate
gcloud auth login
gcloud config set project your-project-id
```

---

## Core Terraform Concepts

Terraform code is written in HCL (HashiCorp Configuration Language), which is designed to be human-readable and declarative.

### File Structure

A typical Terraform project structure:
```
my-terraform-project/
├── main.tf          # Primary resources
├── variables.tf     # Input variable declarations
├── outputs.tf       # Output value declarations  
├── terraform.tfvars # Variable value assignments
├── versions.tf      # Provider version constraints
└── modules/         # Custom modules directory
    └── webserver/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### Providers

Providers are plugins that Terraform uses to interact with a specific API (e.g., AWS, Azure, GCP). They grant Terraform access to resources and data sources.

**Provider Declaration:**
```hcl
# versions.tf or main.tf
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = "Learning"
      ManagedBy   = "Terraform"
    }
  }
}
```

**Version constraint operators:**

| Constraint | Meaning |
|---|---|
| `= 6.2.0` | Exactly this version |
| `>= 6.0` | This version or any newer (including future major versions, which is risky) |
| `~> 6.0` | Any `6.x` (`>= 6.0, < 7.0`): new features and fixes, but no breaking major upgrade |
| `~> 6.2.0` | Any `6.2.x` (`>= 6.2.0, < 6.3.0`): patch releases only |

The exact versions Terraform picks are recorded in `.terraform.lock.hcl`. Commit that file so everyone on the team uses the same versions.

### Resources

A resource block defines a piece of infrastructure, like a virtual machine or a DNS record.

**Syntax:** `resource "TYPE" "NAME" { ... }`

- **TYPE** (`aws_instance`): The kind of resource to create
- **NAME** (`web_server`): A local name to refer to this resource in your code
- **ARGUMENTS** (`ami`, `instance_type`): The configuration for the resource

```hcl
resource "aws_instance" "web_server" {
  ami           = data.aws_ami.latest_ubuntu.id # Looked up with a data source (see below) instead of hardcoded
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.web_sg.id] # A reference: creates a dependency
  
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y nginx
              echo "<h1>Hello from Terraform!</h1>" > /var/www/html/index.html
              systemctl enable --now nginx
              EOF

  tags = {
    Name = "MyWebServer"
    Type = "WebServer"
  }
}
```

**Referencing resources:** `<TYPE>.<NAME>.<ATTRIBUTE>`, e.g. `aws_instance.web_server.public_ip`. Every reference tells Terraform that one resource depends on another, which is how it works out the order to create things in.

### Input Variables

Variables make your configuration flexible and reusable. You declare them using a `variable` block.

```hcl
# variables.tf
variable "instance_type" {
  description = "The EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  # No default: Terraform will prompt for a value, or fail in automation
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true # Hidden in plan/apply output (but still stored in state!)
}

variable "server_ports" {
  description = "List of ports for the server"
  type        = list(number)
  default     = [80, 443]
}

variable "server_config" {
  description = "Server configuration"
  type = object({
    name     = string
    port     = number
    protocol = string
  })
  default = {
    name     = "web-server"
    port     = 80
    protocol = "HTTP"
  }
}
```

**Variable Types:**
- `string` - Text values
- `number` - Numeric values  
- `bool` - True/false values
- `list(type)` - Ordered collection
- `set(type)` - Unordered unique collection
- `map(type)` - Key-value pairs
- `object({...})` - Complex structured data

**Using Variables:**
```hcl
resource "aws_instance" "web_server" {
  ami           = data.aws_ami.latest_ubuntu.id
  instance_type = var.instance_type
  
  tags = {
    Name        = "${var.environment}-web-server"
    Environment = var.environment
  }
}
```

**Setting Variable Values:**

1. **terraform.tfvars file:**
```hcl
# terraform.tfvars
instance_type = "t3.small"
environment   = "production"
server_ports  = [80, 443, 8080]
```

2. **Command line:**
```bash
terraform apply -var="instance_type=t3.small" -var="environment=production"
terraform apply -var-file="prod.tfvars"
```

3. **Environment variables:**
```bash
export TF_VAR_instance_type="t3.small"
export TF_VAR_environment="production"
```

**Variable precedence** (when the same variable is set in several places, the *highest* in this list wins):
1. `-var` and `-var-file` on the command line (later flags win over earlier ones)
2. `*.auto.tfvars` / `*.auto.tfvars.json` files (alphabetical order)
3. `terraform.tfvars.json`
4. `terraform.tfvars`
5. `TF_VAR_` environment variables
6. The `default` in the `variable` block
7. If none of these are set: Terraform prompts you interactively

### Outputs

Outputs are like return values. They expose information about the infrastructure you've created.

```hcl
# outputs.tf
output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.web_server.public_ip
}

output "instance_url" {
  description = "URL to access the web server"
  value       = "http://${aws_instance.web_server.public_ip}"
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.web_sg.id
  sensitive   = false  # Set to true for sensitive data
}
```

### Data Sources

A `data` block fetches information about existing resources that are not managed by your current Terraform configuration.

```hcl
# Get the latest Ubuntu AMI
data "aws_ami" "latest_ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's AWS account ID
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get current AWS region
data "aws_region" "current" {}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Use the data sources
resource "aws_instance" "web_server" {
  ami           = data.aws_ami.latest_ubuntu.id
  instance_type = var.instance_type
  
  tags = {
    Name      = "Server in ${data.aws_region.current.region}"
    AccountID = data.aws_caller_identity.current.account_id
  }
}
```

### Local Values

Local values assign a name to an expression for reuse within a module.

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = "terraform-learning"
    ManagedBy   = "Terraform"
    CreatedBy   = data.aws_caller_identity.current.user_id
  }
  
  instance_name = "${var.environment}-${var.project_name}-web"
}

resource "aws_instance" "web_server" {
  ami           = data.aws_ami.latest_ubuntu.id
  instance_type = var.instance_type
  
  tags = merge(local.common_tags, {
    Name = local.instance_name
  })
}
```

---

## The Standard Terraform Workflow

This is the core loop you'll use every day with Terraform.

### 1. `terraform init`

**What it does:** Initializes the working directory by downloading provider plugins and setting up the backend.

**When to run:** 
- The first time you create a new configuration
- When you add a new provider
- When you change the backend configuration

```bash
terraform init
```

**Output example:**
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 6.0"...
- Installing hashicorp/aws v6.68.0...
- Installed hashicorp/aws v6.68.0 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above.

Terraform has been successfully initialized!
```

`init` creates a `.terraform/` directory (downloaded plugins and modules, never commit it) and `.terraform.lock.hcl` (exact versions and checksums, always commit it). It's safe to run `init` as many times as you like.

### 2. `terraform fmt`

**What it does:** Formats your Terraform files to a canonical format and style.

```bash
terraform fmt              # format files in the current directory
terraform fmt -recursive   # include subdirectories (e.g. modules/)
terraform fmt -check       # report unformatted files without changing them (useful in CI)
```

### 3. `terraform validate`

**What it does:** Validates the configuration files for syntax errors and internal consistency (e.g. references to resources that don't exist, wrong argument types). It doesn't contact the cloud provider, so it can't catch problems like a bucket name that's already taken.

```bash
terraform validate
```

### 4. `terraform plan`

**What it does:** Creates a "dry run" execution plan. It compares your configuration to the state file and real-world infrastructure to show what will be changed.

```bash
terraform plan
# or save the plan to a file
terraform plan -out=tfplan
```

**Plan Symbols:**
- `+` Create new resource
- `-` Destroy existing resource  
- `~` Update resource in-place (same resource, modified)
- `-/+` Replace resource (destroy, then create). Look for `# forces replacement` next to the argument responsible
- `+/-` Replace resource, creating the new one *before* destroying the old one (`create_before_destroy`)
- `<=` Read data source (shown only when it can't be read until apply time)

**Example output:**
```
Terraform will perform the following actions:

  # aws_instance.web_server will be created
  + resource "aws_instance" "web_server" {
      + ami                          = "ami-0123456789abcdef0"
      + instance_type                = "t3.micro"
      + public_ip                   = (known after apply)
      # ... more attributes
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

### 5. `terraform apply`

**What it does:** Executes the plan. It will show you the plan again and ask for confirmation before making changes.

```bash
terraform apply
# or apply a saved plan
terraform apply tfplan
# or auto-approve (use with caution!)
terraform apply -auto-approve
```

### 6. `terraform show`

**What it does:** Shows the current state or a saved plan.

```bash
terraform show
# or show a saved plan
terraform show tfplan
```

### 7. `terraform destroy`

**What it does:** Creates a plan to destroy all infrastructure managed by the configuration.

```bash
terraform destroy
# or destroy specific resources (for exceptional situations only, not everyday use)
terraform destroy -target=aws_instance.web_server
```

`terraform destroy` is the same as `terraform apply -destroy`. To remove a single resource for good, the normal way is to delete it from your code and run `terraform apply`.

### 8. `terraform output`

**What it does:** Prints output values from the state, which is handy for scripts.

```bash
terraform output                    # all outputs
terraform output -raw website_url   # one value, without quotes (for use in scripts)
terraform output -json              # machine-readable
```

### Additional Useful Commands

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_instance.web_server

# Detect drift: show what changed outside Terraform, without proposing changes
terraform plan -refresh-only

# Accept those outside changes into the state (replaces the deprecated `terraform refresh`)
terraform apply -refresh-only

# Force a resource to be recreated (replaces the deprecated `terraform taint`)
terraform apply -replace=aws_instance.web_server

# Show which providers the configuration requires
terraform providers

# Interactive console for testing expressions and functions
terraform console

# Generate a visual dependency graph (DOT format)
terraform graph
```

---

## Hands-On Example: Your First Infrastructure

Let's create a complete, working example that deploys a web server on AWS.

> **How this relates to the class demo**: this is a write-it-yourself version of Steps 1 and 3 of the
> [hands-on demo](./hands-on-demo/README.md). It builds the same kind of network and web server, but you type every file
> yourself, starting from an empty folder. The class demo goes further: remote state in S3 (Step 2), update in place vs
> replacement (Step 4), and modules (Step 5). Build this example first for practice, then work through the demo.

### Step 1: Create the Project Structure

```bash
mkdir terraform-webserver
cd terraform-webserver
```

### Step 2: Create the Configuration Files

**versions.tf:**
```hcl
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

**main.tf:**
```hcl
provider "aws" {
  region = var.aws_region
}

# Get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# Create VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Create Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Create subnet
resource "aws_subnet" "main" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-subnet"
  }
}

# Create route table
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "${var.project_name}-rt"
  }
}

# Associate route table with subnet
resource "aws_route_table_association" "main" {
  subnet_id      = aws_subnet.main.id
  route_table_id = aws_route_table.main.id
}

# Create Security Group
resource "aws_security_group" "web" {
  name_prefix = "${var.project_name}-web-"
  vpc_id      = aws_vpc.main.id
  
  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # No SSH rule: we don't need to log in. If you do, restrict port 22 to your
  # own IP (e.g. "203.0.113.10/32"), or better, use AWS Systems Manager Session Manager.
  
  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-web-sg"
  }
}

# Create EC2 instance
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.main.id
  vpc_security_group_ids = [aws_security_group.web.id]
  
  # user_data takes plain text; the provider handles the encoding for you
  user_data = templatefile("${path.module}/user_data.sh", {
    server_name = var.project_name
  })

  # Require IMDSv2 (token-based instance metadata) — a security best practice
  metadata_options {
    http_tokens = "required"
  }
  
  tags = {
    Name = "${var.project_name}-web-server"
  }
}
```

**variables.tf:**
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "terraform-demo"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
```

**outputs.tf:**
```hcl
output "public_ip" {
  description = "Public IP address of the web server"
  value       = aws_instance.web.public_ip
}

output "public_dns" {
  description = "Public DNS name of the web server"
  value       = aws_instance.web.public_dns
}

output "website_url" {
  description = "URL of the website"
  value       = "http://${aws_instance.web.public_ip}"
}
```

**user_data.sh:**
```bash
#!/bin/bash
apt-get update
apt-get install -y nginx

# Instance metadata requires a session token (IMDSv2)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)

# Create a custom index page
# ${server_name} is filled in by Terraform's templatefile(); $INSTANCE_ID and $AZ by bash at boot
cat > /var/www/html/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to ${server_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        h1 { color: #333; }
        .info { background: #f0f0f0; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Hello from Terraform!</h1>
    <div class="info">
        <h2>Server Information</h2>
        <p><strong>Server Name:</strong> ${server_name}</p>
        <p><strong>Deployed with:</strong> Terraform</p>
        <p><strong>Instance ID:</strong> $INSTANCE_ID</p>
        <p><strong>Availability Zone:</strong> $AZ</p>
    </div>
</body>
</html>
EOF

systemctl start nginx
systemctl enable nginx
```

**terraform.tfvars:**
```hcl
project_name  = "my-first-terraform"
instance_type = "t3.micro"
aws_region    = "us-east-1"
```

### Step 3: Deploy the Infrastructure

```bash
# Initialize Terraform
terraform init

# Format the code
terraform fmt

# Validate the configuration
terraform validate

# Preview changes
terraform plan

# Apply changes
terraform apply
```

### Step 4: Test Your Web Server

After deployment, Terraform will output the public IP. Wait a minute or two for the startup script to finish, then visit `http://[PUBLIC_IP]` in your browser to see your web server. (Use `http://`, not `https://`.)

### Step 5: Clean Up

```bash
terraform destroy
```

---

## Managing Complexity with Modules

A module is a self-contained package of Terraform configurations that are managed as a group. Think of them as "functions" for your infrastructure.

### Why Use Modules?

- **Reusability:** Write once, use many times
- **Organization:** Keep related resources together  
- **Maintainability:** Easier to update and debug
- **Collaboration:** Team members can work on different modules
- **Testing:** Modules can be tested independently

### Module Structure

```
modules/
└── webserver/
    ├── main.tf       # Resources
    ├── variables.tf  # Input variables
    ├── outputs.tf    # Output values
    └── README.md     # Documentation
```

### Creating a Module

**modules/webserver/variables.tf:**
```hcl
variable "name" {
  description = "Name for the webserver"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where instance will be launched"
  type        = string
}
```

**modules/webserver/main.tf:**
```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_security_group" "web" {
  name_prefix = "${var.name}-"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.name}-sg"
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.web.id]
  
  user_data = file("${path.module}/user_data.sh") # path.module = this module's folder
  
  tags = {
    Name = var.name
  }
}
```

**modules/webserver/outputs.tf:**
```hcl
output "public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web.public_ip
}

output "instance_id" {
  description = "Instance ID"
  value       = aws_instance.web.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.web.id
}
```

### Using a Module

```hcl
# Call the webserver module
module "production_web_server" {
  source = "./modules/webserver"
  
  name          = "prod-web"
  instance_type = "t3.small"
  vpc_id        = aws_vpc.main.id
  subnet_id     = aws_subnet.main.id
}

module "staging_web_server" {
  source = "./modules/webserver"
  
  name          = "staging-web"
  instance_type = "t3.micro"
  vpc_id        = aws_vpc.main.id
  subnet_id     = aws_subnet.main.id
}

# Use outputs from modules
output "prod_server_ip" {
  value = module.production_web_server.public_ip
}

output "staging_server_ip" {
  value = module.staging_web_server.public_ip
}
```

### Module Sources

Modules can be sourced from various locations:

```hcl
# Local path
module "webserver" {
  source = "./modules/webserver"
}

# Terraform Registry (always pin a version)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"
}

# Git repository
module "webserver" {
  source = "git::https://github.com/user/terraform-webserver-module.git"
}

# Git with specific branch/tag
module "webserver" {
  source = "git::https://github.com/user/terraform-webserver-module.git?ref=v1.0.0"
}
```

After adding a module or changing a module's `source`, run `terraform init` again so Terraform can download or register it. Before using a registry module, read its documentation and inputs on the Registry. A registry module is someone else's code, so check that it's well maintained (look for verified or widely used modules) and always pin its version.

---

## Understanding Terraform State

### What is Terraform State?

The `terraform.tfstate` file is a JSON file that stores the state of your managed infrastructure. It serves as:

- **Mapping:** Links your configuration to real-world resources
- **Metadata Storage:** Tracks resource dependencies and attributes
- **Performance:** Caches resource attributes for large infrastructures
- **Locking:** Prevents concurrent operations (with remote backends)

### State File Contents

```json
{
  "version": 4,
  "terraform_version": "1.15.5",
  "serial": 1,
  "lineage": "abc123",
  "outputs": {},
  "resources": [
    {
      "mode": "managed",
      "type": "aws_instance",
      "name": "web",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 1,
          "attributes": {
            "id": "i-1234567890abcdef0",
            "ami": "ami-0c55b159cbfafe1f0",
            "instance_type": "t3.micro",
            "public_ip": "203.0.113.12"
          }
        }
      ]
    }
  ]
}
```

### Local vs Remote State

#### Local State (Default)
- Stored in `terraform.tfstate` in your project directory
- Good for learning and solo projects
- **Problems with teams:**
  - No collaboration - conflicts when multiple people work
  - No locking - concurrent runs can corrupt state
  - Security - sensitive data in plain text locally
  - Single point of failure - lose the laptop, lose the state

#### Remote State (Production)
- Stored in a shared backend (S3, Azure Blob, GCS, etc.)
- Enables team collaboration
- Provides state locking
- Better security with encryption

### Configuring Remote State with S3

Since Terraform 1.10, the S3 backend can lock state **natively** using a lock file in the same bucket (`use_lockfile = true`). Older tutorials create a DynamoDB table for locking. That approach is deprecated, so you don't need it.

**Step 1: Create the state bucket**

The state bucket must exist *before* the backend can use it, and it shouldn't be managed by the same configuration whose state it stores. Create it once, either with the AWS CLI (see the hands-on demo) or with a small separate "bootstrap" configuration:

```hcl
# bootstrap/main.tf - applied once, separately, to create the backend bucket
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state-bucket-unique-name-123"

  lifecycle {
    prevent_destroy = true # Losing this bucket means losing all your state
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled" # Lets you recover previous versions of the state
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**Step 2: Configure the backend in your main project**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket       = "my-terraform-state-bucket-unique-name-123"
    key          = "global/s3/terraform.tfstate" # Path of the state file inside the bucket
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true # S3-native state locking
  }
}
```

Backend blocks **cannot use variables** (`var.` or `local.`), because the backend is configured before anything else is evaluated. To avoid hardcoding values, use *partial configuration*: leave some arguments out and pass them at init time with `terraform init -backend-config="bucket=..."`.

**Step 3: Initialize with the new backend**
```bash
terraform init
```

If you already have local state, Terraform asks whether to copy it to the new backend. Answer `yes`.

### State Commands

```bash
# List all resources in state
terraform state list

# Show details of specific resource
terraform state show aws_instance.web

# Move resource to different address (prefer a `moved` block, see below)
terraform state mv aws_instance.old_name aws_instance.new_name

# Remove resource from state but keep the real resource (prefer a `removed` block, see below)
terraform state rm aws_instance.web

# Download the current state (e.g. to make a backup)
terraform state pull > backup.tfstate

# Overwrite the remote state with a local file — DANGEROUS, last-resort recovery only
terraform state push backup.tfstate
```

### Bringing Existing Resources Under Terraform: `import` Blocks

If something was created by hand (ClickOps), Terraform doesn't know about it. Since Terraform 1.5 you can import it **in code**, so the import is reviewed in a plan like any other change:

```hcl
import {
  to = aws_s3_bucket.legacy
  id = "my-hand-made-bucket"
}

resource "aws_s3_bucket" "legacy" {
  bucket = "my-hand-made-bucket"
}
```

Terraform can even write the resource block for you:

```bash
terraform plan -generate-config-out=generated.tf
```

Review the generated code and tidy it up, then `terraform apply` to complete the import. After that, the `import` block can be deleted. (The older `terraform import <address> <id>` command still works, but it changes the state immediately, with no plan to review.)

### Refactoring Safely: `moved` and `removed` Blocks

Renaming a resource in code (`aws_instance.web` → `aws_instance.web_server`) looks to Terraform like *"destroy the old one, create a new one"*. A `moved` block tells it the resource just has a new name:

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.web_server
}
```

`terraform plan` now shows the move with no destroy or create. The same works when you move resources into a module (`to = module.web.aws_instance.this`).

To stop managing a resource **without destroying it**, use a `removed` block (Terraform 1.7+):

```hcl
removed {
  from = aws_s3_bucket.legacy

  lifecycle {
    destroy = false # Forget it in state, leave the real bucket alone
  }
}
```

### State Best Practices

1. **Never edit state files manually** - Use Terraform commands only
2. **Always use remote state for teams** - Local state doesn't scale
3. **Enable state locking** - Prevents corruption from concurrent operations
4. **Backup state regularly** - State is critical and can't be easily recreated
5. **Use separate state files per environment** - Isolate prod/staging/dev
6. **Be careful with sensitive data** - State files contain all resource attributes, including values marked `sensitive`
7. **Never commit state to Git** - Add `*.tfstate` and `*.tfstate.*` to `.gitignore`

---

## Best Practices

### Project Organization

#### Directory Structure for Multiple Environments
```
terraform-infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       └── backend.tf
├── modules/
│   ├── vpc/
│   ├── webserver/
│   └── database/
└── global/
    ├── iam/
    └── route53/
```

Each environment directory has its **own state file and backend**, so a mistake in `dev` can never touch `prod`. Shared logic lives in `modules/`, so the environments don't copy-paste code.

#### Alternative: Workspace-based Structure
```
terraform-infrastructure/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
├── dev.tfvars
├── staging.tfvars
├── prod.tfvars
└── modules/
```

### Naming Conventions

**Resources:**
```hcl
# Use descriptive, consistent names
resource "aws_instance" "web_server" {}        # Good
resource "aws_instance" "i" {}                 # Bad

# Include environment in name
resource "aws_instance" "prod_web_server" {}   # Good
resource "aws_instance" "web_server_prod" {}   # Also good
```

**Variables:**
```hcl
# Use snake_case
variable "instance_type" {}     # Good
variable "instanceType" {}      # Bad

# Be descriptive
variable "instance_type" {}     # Good  
variable "type" {}              # Too vague
```

**Tags:**
```hcl
# Use consistent tagging strategy
tags = {
  Name        = "${var.environment}-web-server"
  Environment = var.environment
  Project     = var.project_name
  Owner       = var.owner
  ManagedBy   = "Terraform"
  CostCenter  = var.cost_center
}
```

### Code Organization

**Split configurations into logical files:**
```hcl
# versions.tf - Provider requirements
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# variables.tf - All input variables
variable "environment" {
  description = "Environment name"
  type        = string
}

# locals.tf - Local values and computed data
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# data.tf - All data sources
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
}

# main.tf - Primary resources
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
}

# outputs.tf - All outputs
output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

### Variable Management

**Use validation rules:**
```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = can(regex("^t[2-4]g?\\.", var.instance_type))
    error_message = "Instance type must be from the t2, t3, or t4g family."
  }
}
```

**Provide good descriptions:**
```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC. Should be a valid IPv4 CIDR block."
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}
```

### Security Best Practices

**Never hardcode secrets:**
```hcl
# Bad - hardcoded password
resource "aws_db_instance" "main" {
  password = "supersecret123"  # Don't do this!
}

# Good - use random password
resource "random_password" "db_password" {
  length  = 16
  special = true
}

resource "aws_db_instance" "main" {
  password = random_password.db_password.result
}

# Better - use AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}

# Best (for RDS) - let AWS generate and rotate the password in Secrets Manager,
# so it never passes through Terraform or its state at all
resource "aws_db_instance" "main" {
  manage_master_user_password = true
}
```

**Remember: state contains secrets.** The `random_password` and Secrets Manager approaches above keep secrets out of your *code*, but the values still end up in the state file. That's why state must be encrypted and access-controlled. Newer Terraform versions add *ephemeral* values and *write-only* arguments (e.g. `password_wo`), which are never written to state. Look these up once you're comfortable with the basics.

**Restrict security groups:**
```hcl
# Bad - too open
resource "aws_security_group" "web" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Anyone can SSH!
  }
}

# Good - restricted access
resource "aws_security_group" "web" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr_block]  # Only admins
  }
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Public HTTP is OK
  }
}
```

### Version Control

**Use `.gitignore`:**
```gitignore
# .gitignore
*.tfstate
*.tfstate.*
*.tfvars
*.tfplan
.terraform/
crash.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
```

**Do commit `.terraform.lock.hcl`.** It pins the exact provider versions and checksums, so everyone (and your CI pipeline) uses identical providers. Ignoring `*.tfvars` is a safe default. Commit a `terraform.tfvars.example` to document which values are expected.

**Pin provider versions:**
```hcl
# Good - version constraint that allows safe upgrades only
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"  # Any 6.x, never 7.0 (major versions can contain breaking changes)
    }
  }
}

# Bad - no version constraint
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      # No version specified!
    }
  }
}
```

### Documentation

**Document your code:**
```hcl
# Create VPC for the application
# This VPC will host all application resources including:
# - Web servers in public subnets
# - Database servers in private subnets  
# - NAT gateways for outbound internet access
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(local.common_tags, {
    Name = "${var.environment}-vpc"
  })
}
```

**Create README files:**
```markdown
# Web Application Infrastructure

This Terraform configuration creates a web application infrastructure on AWS.

## Architecture

- VPC with public and private subnets
- Auto Scaling Group for web servers
- RDS database in private subnet
- Application Load Balancer

## Usage

1. Configure AWS credentials
2. Copy `terraform.tfvars.example` to `terraform.tfvars`
3. Update variables in `terraform.tfvars`
4. Run `terraform init`
5. Run `terraform plan`
6. Run `terraform apply`

## Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| environment | Environment name | string | - |
| instance_type | EC2 instance type | string | t3.micro |

## Outputs

| Name | Description |
|------|-------------|
| load_balancer_dns | DNS name of the load balancer |
| database_endpoint | RDS database endpoint |
```

---

## Advanced Concepts

### Workspaces

Workspaces allow you to manage multiple distinct states for the same configuration. This is useful for managing similar copies of infrastructure (e.g. per-developer test environments, or dev/staging/prod in a small project) without duplicating code.

```bash
# List workspaces
terraform workspace list

# Create new workspace
terraform workspace new development
terraform workspace new staging
terraform workspace new production

# Switch between workspaces
terraform workspace select development

# Show current workspace
terraform workspace show

# Delete workspace (must be empty)
terraform workspace delete development
```

**Using workspace in configuration:**
```hcl
locals {
  environment = terraform.workspace
  
  # Different instance sizes per environment
  instance_type = {
    development = "t3.micro"
    staging     = "t3.small" 
    production  = "t3.medium"
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type[local.environment]
  
  tags = {
    Name        = "${local.environment}-web-server"
    Environment = local.environment
  }
}

```

**State per workspace:** you don't change the backend configuration for workspaces (backend blocks can't use variables or `terraform.workspace`). The backend separates them automatically. With S3, the `default` workspace uses `key`, and other workspaces are stored under `env:/<workspace>/<key>`:

```hcl
terraform {
  backend "s3" {
    bucket       = "my-terraform-state"
    key          = "app/terraform.tfstate" # dev workspace -> env:/dev/app/terraform.tfstate
    region       = "us-east-1"
    use_lockfile = true
  }
}
```

**Workspaces vs separate directories:** all workspaces share the same code, backend, and credentials, and it's easy to forget which one is selected (`terraform workspace show`). For environments that need strong isolation, like production in a separate AWS account, most teams use separate directories (or separate repos) per environment instead.

### Provisioners

Provisioners execute scripts on a local or remote machine as part of resource creation. **Use sparingly!**

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = var.key_name
  
  # File provisioner - copy files to remote machine
  provisioner "file" {
    source      = "app.conf"
    destination = "/tmp/app.conf"
    
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
  
  # Remote-exec provisioner - run commands on remote machine
  provisioner "remote-exec" {
    inline = [
      "sudo mv /tmp/app.conf /etc/app/app.conf",
      "sudo systemctl restart app"
    ]
    
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
  
  # Local-exec provisioner - run commands locally
  provisioner "local-exec" {
    command = "echo 'Instance ${self.id} created!'"
  }
}

# Better approach: Use user_data or configuration management
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  
  user_data = templatefile("${path.module}/userdata.sh", {
    app_config = var.app_config
  })
}
```

**Why avoid provisioners?** HashiCorp itself calls them a *last resort*:
- Terraform can't see what they did, so their changes aren't in the plan or the state
- They only run at creation (or destruction), not when your script changes
- They need network access and SSH keys from wherever Terraform runs (e.g. your CI runner)
- If one fails, the resource is marked "tainted" and gets replaced on the next apply
- Better alternatives exist: `user_data`/cloud-init, pre-built images (Packer), containers, or configuration management (Ansible)

### Lifecycle Rules

Control resource lifecycle behavior:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  
  lifecycle {
    # Create new resource before destroying old one
    create_before_destroy = true
    
    # Prevent accidental deletion: any plan that would destroy this fails with an error
    prevent_destroy = true
    
    # Ignore changes to specific attributes
    ignore_changes = [
      # Ignore AMI changes (might be patched externally)
      ami,
      # Ignore tags that might be added by other tools
      tags["LastPatched"]
    ]
    
    # Replace resource when specific attributes change
    replace_triggered_by = [
      aws_security_group.web.id
    ]
  }
  
  tags = {
    Name = "web-server"
  }
}

# terraform_data (built in since Terraform 1.4, replaces the older null_resource):
# re-runs its provisioner whenever the list of cluster instances changes
resource "terraform_data" "cluster" {
  triggers_replace = aws_instance.cluster[*].id
  
  provisioner "local-exec" {
    command = "echo 'Cluster configuration changed!'"
  }
}
```

### Dynamic Blocks

Generate repeated nested blocks dynamically:

> **Note:** For security groups specifically, the AWS provider now recommends separate rule resources (`aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`) instead of inline `ingress`/`egress` blocks. The example below still works and is a good illustration of `dynamic` blocks.

```hcl
variable "security_group_rules" {
  description = "List of security group rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = var.vpc_id
  
  # Dynamic ingress rules
  dynamic "ingress" {
    for_each = var.security_group_rules
    iterator = rule
    
    content {
      from_port   = rule.value.from_port
      to_port     = rule.value.to_port
      protocol    = rule.value.protocol
      cidr_blocks = rule.value.cidr_blocks
    }
  }
  
  # Static egress rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Dynamic subnets
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}
```

### Meta-Arguments

**`count`** - Create multiple instances of a resource:
```hcl
# Create multiple instances
resource "aws_instance" "web" {
  count = var.instance_count
  
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  tags = {
    Name = "web-server-${count.index + 1}"
  }
}

# Reference instances
output "instance_ips" {
  value = aws_instance.web[*].public_ip
}
```

**`for_each`** - Create resources based on a map or set:
```hcl
variable "users" {
  type = map(object({
    role = string
    department = string
  }))
  default = {
    john = {
      role = "developer"
      department = "engineering"
    }
    jane = {
      role = "manager"  
      department = "engineering"
    }
  }
}

resource "aws_iam_user" "users" {
  for_each = var.users
  
  name = each.key
  
  tags = {
    Role       = each.value.role
    Department = each.value.department
  }
}

# Reference specific user
output "john_arn" {
  value = aws_iam_user.users["john"].arn
}

# Reference all users
output "all_user_arns" {
  value = values(aws_iam_user.users)[*].arn
}
```

**`count` or `for_each`?** Use `for_each` when items have meaningful names (users, buckets, subnets per AZ). With `count`, resources are tracked by position (`[0]`, `[1]`, ...), so removing an item from the middle of a list shifts every later item and Terraform will want to recreate them. With `for_each`, each resource is tracked by its key, so removing one only affects that one.

**`depends_on`** - Explicit dependencies. Only needed when Terraform can't infer a dependency from a reference:
```hcl
resource "aws_iam_role_policy" "app_s3_access" {
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_access.json
}

resource "aws_instance" "app" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.app.name

  # The app reads from S3 at boot. Nothing in this block references the policy,
  # so without depends_on Terraform might start the instance before the policy exists.
  depends_on = [aws_iam_role_policy.app_s3_access]
}
```

### Functions

Terraform includes many built-in functions:

```hcl
locals {
  # String functions
  environment = upper(var.environment)              # Convert to uppercase
  server_name = format("%s-web-server", var.env)   # String formatting
  
  # Collection functions
  all_subnets = concat(var.public_subnets, var.private_subnets)
  subnet_count = length(var.subnets)
  first_subnet = element(var.subnets, 0)
  
  # Numeric functions
  max_size = max(var.min_size, 3)
  
  # Date/time functions (careful: timestamp() changes on every run,
  # so anything using it shows a change in every plan)
  current_time = timestamp()
  
  # Encoding functions
  user_data_b64 = base64encode(file("userdata.sh")) # e.g. for arguments like user_data_base64
  
  # File functions
  config_file = file("${path.module}/config.yaml")
  
  # Type conversion
  instance_count = tonumber(var.instance_count_string)
  
  # Conditional logic
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
  
  # Complex expressions with for
  subnet_cidrs = [for i, subnet in var.subnets : cidrsubnet(var.vpc_cidr, 8, i)]
  
  # Map transformations
  tagged_users = {
    for name, user in var.users :
    name => merge(user, {
      created_by = "terraform"
    })
  }
}
```

**Try functions in the console:**
```bash
terraform console
> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"
> upper("dev")
"DEV"
```

### Conditional Expressions

```hcl
# Ternary operator
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"
  
  # Conditional resource creation: 1 copy or none
  count = var.create_instance ? 1 : 0
  
  tags = {
    Name = var.environment == "production" ? "prod-web" : "dev-web"
    
    # Conditional tag (null means "don't set it")
    Backup = var.environment == "production" ? "daily" : null
  }

  # Conditional nested block: only add an extra disk in production
  dynamic "ebs_block_device" {
    for_each = var.environment == "production" ? [1] : []
    
    content {
      device_name = "/dev/sdf"
      volume_size = 100
      volume_type = "gp3"
    }
  }
}

# Referencing a resource that uses count = 0 or 1
output "web_ip" {
  value = var.create_instance ? aws_instance.web[0].public_ip : null
}
```

---

## Troubleshooting Common Issues

### State Issues

**Problem:** "Resource already exists"
```
Error: resource already exists
```

The resource exists in AWS but not in your state (e.g. it was created by hand, or a previous apply was interrupted).

**Solution:** Import it with an `import` block (see [Bringing Existing Resources Under Terraform](#bringing-existing-resources-under-terraform-import-blocks)), or give your resource a different name if they're actually meant to be separate.

**Problem:** State written by a newer Terraform version
```
Error: state snapshot was created by Terraform v1.15.0, which is newer than current v1.11.0
```

**Solution:** Someone on the team used a newer Terraform. Upgrade your Terraform to match. Prevent it happening again by setting `required_version` and agreeing on one version (`tfenv`/`tenv` help).

**Problem:** State file lost or damaged

**Solution:** With a versioned S3 backend, restore a previous version of the state object from the S3 console (or CLI), then run `terraform plan` to check what Terraform thinks has changed. This is why bucket versioning matters.

**Problem:** State lock issues
```
Error: Error acquiring the state lock
```

First, check whether someone (or a CI pipeline) really is running Terraform right now. The lock is doing its job. If you're sure the lock was left behind by a crashed or cancelled run:

**Solution:** Force unlock (use carefully!)
```bash
# Get lock ID from error message
terraform force-unlock LOCK_ID
```

### Configuration Issues

**Problem:** Circular dependency
```
Error: Cycle: aws_security_group.web, aws_instance.web
```

**Solution:** Break the cycle. A classic example is two security groups that each allow traffic from the other:
```hcl
# Bad - each group references the other, so neither can be created first
resource "aws_security_group" "app" {
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }
}

resource "aws_security_group" "db" {
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

# Good - create both empty groups, then attach the rules as separate resources
resource "aws_security_group" "app" {
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
```

**Problem:** Invalid resource reference
```
Error: Reference to undeclared resource
```

**Solution:** Check resource names and references
```hcl
# Make sure resource exists and name matches
resource "aws_vpc" "main" {  # Resource name is "main"
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id  # Reference matches resource name
}
```

### Provider Issues

**Problem:** Provider initialization fails
```
Error: Failed to install provider
```

**Solution:** Clear and reinitialize
```bash
rm -rf .terraform
terraform init
```

**Problem:** Provider version conflicts
```
Error: Incompatible provider version
```

This usually means your constraint and a module's constraint don't overlap, e.g. you require `~> 6.0` but an old module version requires `< 6.0`.

**Solution:** Upgrade the module to a version that supports your provider version (check its changelog on the Registry). If you changed constraints, run `terraform init -upgrade` so Terraform picks new versions and updates the lock file.
```bash
terraform init -upgrade
```

### Plan/Apply Issues

**Problem:** Timeout during apply
```
Error: timeout while waiting for resource to reach target state
```

**Solution:** Increase timeout or check resource dependencies
```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  
  timeouts {
    create = "10m"
    update = "10m"
    delete = "10m"
  }
}
```

**Problem:** Authentication errors
```
Error: AccessDenied
```

**Solution:** Check AWS credentials and permissions
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check environment variables
env | grep AWS

# Check which profile/region the CLI (and Terraform) is using
aws configure list
```

Also check you're in the region you expect. Resources you can't "see" are often just in a different region.

### Debugging Tips

**Enable detailed logging:**
```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=terraform.log
terraform apply
```

**Use terraform console for testing:**
```bash
terraform console
> var.instance_type
> data.aws_ami.ubuntu.id
> local.common_tags
```

**Validate configuration frequently:**
```bash
terraform fmt -check
terraform validate
terraform plan -detailed-exitcode   # exit code 0 = no changes, 2 = changes present, 1 = error
```

---

## Next Steps and Resources

### Terraform Certification

HashiCorp offers an entry-level **Terraform Associate** certification. Check the [HashiCorp certification page](https://developer.hashicorp.com/certifications/infrastructure-automation) for the current exam version and its study guide.

### Advanced Topics to Explore

1. **HCP Terraform** (formerly Terraform Cloud) and alternatives (Spacelift, env0, Scalr)
   - Remote runs and state management
   - Policy as Code (Sentinel, OPA)
   - Private module registry
   - Drift detection

2. **Testing Infrastructure**
   - `terraform test`: Terraform's built-in testing framework (`.tftest.hcl` files)
   - `check` blocks and `precondition`/`postcondition` for validating infrastructure
   - Terratest (Go-based integration testing)

3. **CI/CD Integration** (covered in Weeks 6–7)
   - Running `fmt`, `validate`, and `plan` on pull requests; `apply` on merge
   - GitHub Actions, GitLab CI/CD, Atlantis

4. **Advanced Patterns**
   - Multi-account AWS deployments
   - Terragrunt for keeping many environments DRY
   - Infrastructure drift detection

5. **Security and Compliance** (more in Week 8)
   - Security scanning (Checkov, Trivy — which absorbed tfsec)
   - Policy as Code
   - Secret management, ephemeral values, and write-only arguments

### Useful Tools

**Code Quality:**
- `terraform fmt` - Format code
- `terraform validate` - Validate syntax
- [`tflint`](https://github.com/terraform-linters/tflint) - Linting (catches things like invalid instance types)
- [`checkov`](https://www.checkov.io/) / [`trivy`](https://trivy.dev/) - Security scanning
- [`infracost`](https://www.infracost.io/) - Cost estimates for a plan

**Documentation:**
- [`terraform-docs`](https://terraform-docs.io/) - Generate module documentation
- [`pre-commit`](https://pre-commit.com/) hooks for validation
- IDE plugins: HashiCorp Terraform extension for VS Code / JetBrains

**State and Workflow:**
- `terraform state` commands, `import`/`moved`/`removed` blocks
- Terragrunt for DRY configurations
- Atlantis for PR-based workflows

### Learning Resources

**Official Documentation:**
- [Terraform Registry](https://registry.terraform.io/) - Providers and modules (each provider has full resource documentation)
- [Terraform Tutorials](https://developer.hashicorp.com/terraform/tutorials) - Official step-by-step tutorials
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs) - Complete language and CLI reference
- [OpenTofu Documentation](https://opentofu.org/docs/)

**Books:**
- "Terraform: Up & Running" by Yevgeniy Brikman
- "Infrastructure as Code" by Kief Morris
- "Terraform in Action" by Scott Winkler

**Community:**
- [Terraform Community Forum](https://discuss.hashicorp.com/c/terraform-core)
- [r/Terraform](https://reddit.com/r/Terraform)
- [Terraform GitHub](https://github.com/hashicorp/terraform)

**Practice:**
- [AWS Free Tier](https://aws.amazon.com/free/) for hands-on practice (set up a billing alert first, and always `terraform destroy` when you're done)
- [AWS provider examples](https://github.com/hashicorp/terraform-provider-aws/tree/main/examples)

### Sample Projects to Build

1. **Beginner**: Single web server with security group
2. **Intermediate**: Multi-tier application (web, app, database layers)
3. **Advanced**: Auto-scaling web application with load balancer
4. **Expert**: Multi-region, multi-account deployment with CI/CD

### Final Tips

1. **Start small** - Don't try to terraform everything at once
2. **Use modules** - Build reusable components
3. **Plan before applying** - Always review changes
4. **Version everything** - Code, state, and provider versions
5. **Test thoroughly** - Validate in non-production first
6. **Monitor changes** - Track who changed what and when
7. **Keep learning** - Terraform and cloud services evolve rapidly

Remember: Infrastructure as Code is a journey, not a destination. Start with simple examples, build confidence, and gradually tackle more complex scenarios. The key is consistent practice and continuous learning.

---

*This guide provides a solid foundation for learning Terraform. Keep this document as a reference and don't hesitate to experiment with the examples. Happy terraforming!*