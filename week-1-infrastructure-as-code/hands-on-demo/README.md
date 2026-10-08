# Week 1 Hands-On Demo: ClickOps → Script → Code

**Goal**: Make the core IaC ideas *visible* — imperative vs declarative, idempotency, state, and drift — by creating
the **same server three ways** and watching how each one behaves when you run it again or someone changes it by hand.

This is **not** a Terraform syntax lesson (that's Week 2). Students should leave thinking *"I see why we need this"*,
not *"I memorised HCL"*.

**Cost**: a few cents (a handful of short-lived `t3.micro` instances). **Destroy everything at the end.**

---

## How to Run This Demo: Predict → Run → Explain

Before **every** command, ask the class to **predict** what will happen (in the chat, or with a show of hands).
Then run it, and only then explain. Predictions that turn out wrong are when the learning happens. Don't skip this step to save time.

The code is already written. **Don't live-type it** — open each file, walk through it in a minute or two, then run it.

---

## Prerequisites (do this before class)

- AWS CLI v2 configured (`aws sts get-caller-identity` works)
- Terraform ≥ 1.10 installed
- A **default VPC** in your region (most accounts have one; `aws ec2 describe-vpcs --filters Name=is-default,Values=true`)
- Run `terraform init` in `02-declarative/` **before class** so you aren't waiting on the provider download live
- Have the AWS Console open on **EC2 → Instances**, filtered by tag `Lesson = iac-week1`
- Increase your terminal font size

Optional: `export AWS_REGION=<your-region>` (defaults to `us-east-1`). If you change it, also pass `-var aws_region=<your-region>` to Terraform.

---

## Act 1 — ClickOps

1. In the AWS Console, start the **Launch instance** wizard. Don't launch — just scroll through it.
2. Count the decisions out loud: name, AMI, instance type, key pair, VPC, subnet, public IP, security group, storage, tags...

**Ask**:
- "I need this *exact* server in another region for staging. How confident are you you'd get every setting identical?"
- "Six months from now, how would anyone know *why* it's a t3.micro?"
- "Who reviewed this before it went to production?"

**Point**: Manual work isn't repeatable, isn't reviewable, and leaves no history.

---

## Act 2 — Imperative script

```bash
cd 01-imperative
```

### 2a. Run the script

Open `create-server.sh` and walk through it: look up an AMI, then `run-instances`. It's simple and readable, and it's already
much better than clicking. **Point**: This is already "infrastructure as code" in the loosest sense: it's written down and repeatable.

```bash
./create-server.sh
./list-servers.sh
```

### 2b. Run it again

**Ask**: *"What happens if I run it again?"* (Most people say "nothing" or "error".)

```bash
./create-server.sh
./list-servers.sh
```

**Result**: Two servers. Show both in the Console.
**Point**: This script is **not idempotent**. In a CI pipeline that runs on every commit, you'd get a new server per commit.

### 2c. "Fix" it with a check

Open `create-server-idempotent.sh` and point out the new `describe-instances` check.

```bash
./create-server-idempotent.sh
```

**Result**: "Server already exists — nothing to do." Idempotent, at least for *creating* the server.

**Ask** (don't run anything, just discuss):
- *"Now I want a t3.small. I change `INSTANCE_TYPE` and re-run. What happens?"* → Nothing. The check sees a server and exits.
- *"How do I make it handle that?"* → stop instance, modify attribute, start instance... more code.
- *"And deleting it? Changing tags? Someone edited it in the console?"* → more and more code.

**Point**: To make imperative scripts safe, you end up writing logic to *compare what exists with what you want, then
work out the steps*. **That logic is exactly what declarative tools give you for free.**

### 2d. Clean up the imperative servers

```bash
./cleanup.sh
```

**Point**: We needed *another* hand-written script just to undo the first one.

---

## Act 3 — Declarative with Terraform

```bash
cd ../02-declarative
```

> **Keep Terraform a black box this week.** Week 2 teaches how Terraform works: the workflow, the plan symbols,
> state commands, and update vs replace. Here we only care about how a declarative tool *behaves*. If students ask
> "what does that symbol mean?" or "how do I write this?", the answer is "next week".

Open `main.tf`. Keep it high level: *"This says: there should be ONE server, this type, with these tags.
It doesn't say 'create'. It's a description, not a list of instructions."*

### 3a. Preview, then apply

```bash
terraform plan
```

Read out only the summary line: `Plan: 1 to add`. **Point**: The tool compared the description with reality, worked
out that one server is missing, and is *telling us before it does anything*. Ask the class why being able to preview changes matters.

```bash
terraform apply        # type "yes"
```

### 3b. Apply again: idempotency

**Ask**: *"Same question as before: what happens if I run it again?"*

```bash
terraform apply
```

**Result**: `No changes. Your infrastructure matches the configuration.`
**Point**: Same code, run twice, same result. **Idempotent by design**, with no checking logic written by us.

How did it know the server already existed? Run `ls` and point out the new `terraform.tfstate` file: *"That's the tool's
memory of what it created. We'll look inside it next week."* Ask: *"What if this file was on my laptop and my laptop died?"*
(See Scenario 6 in `state-and-drift.md`.)

### 3c. The change the bash script ignored

**Ask**: *"The bash script ignored our request for a t3.small. What will Terraform do?"*

```bash
terraform plan -var instance_type=t3.small
```

**Result**: The plan says it will change the existing server's instance type: `1 to change`, not `1 to add`.
**Point**: We changed the description and the tool worked out the steps. We didn't write any of the
"stop, modify, start" logic the bash script would need. Don't apply it; just compare it with Act 2c.

---

## Act 4 — Drift

### 4a. Someone "fixes" something in the console

In the AWS Console, edit the instance's tags: change `Environment` from `dev` to `prod-hotfix`.
(Or from the CLI: `aws ec2 create-tags --resources $(terraform output -raw instance_id) --tags Key=Environment,Value=prod-hotfix`)

**Ask**: *"The code didn't change. Will Terraform notice?"*

```bash
terraform plan                   # Environment: "prod-hotfix" -> "dev"
```

**Point**: Terraform detected the drift and wants to **revert it**. If that console change was a real hotfix, the next
`apply` would silently undo it. **Rule: change the code, not the console.**

```bash
terraform apply                  # reality is back in line with code
```

### 4b. Someone deletes the server

In the Console, **terminate** the instance. Wait until it shows `terminated`.

**Ask**: *"What will the plan say now?"*

```bash
terraform plan                   # 1 to add
terraform apply
```

**Point**: The code is the source of truth. Recovering from disaster here means running `apply` again.

---

## Wrap-up — Destroy

```bash
terraform destroy                # type "yes"
cd ../01-imperative && ./list-servers.sh   # should be empty
```

**Point**: Teardown is one command, and it's complete, because Terraform knows exactly what it created.

### Summary table to show the class

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
| Plan unexpectedly wants to replace the server because of `ami` | AWS published a newer Amazon Linux AMI during class. That's a real-world example of why you should check plans before applying them. Use it as a teaching moment. |
| `terraform init` slow in class | Run it before class (see prerequisites) |
| Forgot to clean up | `./01-imperative/cleanup.sh` and `terraform destroy` in `02-declarative/`, then `./01-imperative/list-servers.sh` to confirm |
