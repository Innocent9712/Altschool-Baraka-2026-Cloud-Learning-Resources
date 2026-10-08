# Week 1: Infrastructure as Code (IaC)

This week introduces Infrastructure as Code: managing and provisioning infrastructure through code instead of
manual processes. You'll learn why IaC matters, how it improves consistency and scalability, and which tools are
commonly used to implement it.

**By the end of the week** you'll understand the core principles of IaC and how it helps automate and streamline
cloud infrastructure management.

## Learning Objectives

By the end of this week, you should be able to:

1. Explain the problems with manual ("ClickOps") infrastructure management
2. Explain the difference between **declarative** and **imperative** approaches, with an example of each
3. Define **idempotency** and explain why it matters for automation
4. Describe what IaC **state** is, why it exists, and why it must be protected
5. Explain **configuration drift**, how it's detected, and how to avoid it
6. Distinguish **mutable** from **immutable** infrastructure
7. Name the major IaC tools (Terraform, OpenTofu, Pulumi, CloudFormation, Bicep, Ansible) and when you'd pick each

## Materials

| File | What it is |
|---|---|
| [iac_guide.md](./iac_guide.md) | The main reading: concepts, tools, best practices, glossary, self-check questions |
| [state-and-drift.md](./state-and-drift.md) | Code vs state vs reality, walked through six scenarios |
| [hands-on-demo/](./hands-on-demo/) | The live class demo: the same server created by ClickOps, a Bash script, and Terraform |
| [try-it-yourself/](./try-it-yourself/) | A free, no-cloud version of the demo for you to repeat at home |

## Class Session Plan (2 hours)

| Time | Segment | Notes |
|---|---|---|
| 0:00 – 0:10 | **Hook: the ClickOps problem** | "Prod is gone. Rebuild it by Monday." Who knows what was in it? Use the four questions at the top of the guide. |
| 0:10 – 0:45 | **Concepts** | Declarative vs imperative (taxi analogy) → idempotency → state → drift → mutable vs immutable (pets vs cattle). Keep each to about 5 minutes. The demo makes them concrete. |
| 0:45 – 0:50 | Break | Run `terraform init` in the demo folder now if you haven't already. |
| 0:50 – 1:40 | **Live demo** | [hands-on-demo/README.md](./hands-on-demo/README.md). Ask the class to predict before every command. |
| 1:40 – 1:50 | **Tool landscape** | Guide's "How to Choose" table. Mention the Terraform/OpenTofu licensing story and why we're using Terraform next week. |
| 1:50 – 2:00 | **Check for understanding + wrap-up** | 3–4 questions from "Check Your Understanding", then introduce the take-home exercise and Week 2. |

If time is short, cut the tool landscape down to the table (students can read the details in the guide). Don't cut the demo.

## After Class

1. Read [iac_guide.md](./iac_guide.md) and [state-and-drift.md](./state-and-drift.md)
2. Complete [try-it-yourself/](./try-it-yourself/) and answer its questions
3. Answer the **Check Your Understanding** questions at the end of the guide
4. Install Terraform and the AWS CLI ready for Week 2: [Terraform install](https://developer.hashicorp.com/terraform/install), [AWS CLI install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
