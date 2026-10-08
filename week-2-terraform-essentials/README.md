# Week 2: Terraform Essentials

This week focuses on Terraform, one of the most widely used Infrastructure as Code tools. You'll learn how Terraform
works, its core concepts like providers, resources, and state files, and how to write simple configuration files to
create and manage cloud resources.

**By the end of the week** you'll understand the basics of Terraform and be able to use it to define, deploy, and
manage simple infrastructure in the cloud.

## Learning Objectives

By the end of this week, you should be able to:

1. Install Terraform and configure it to use your AWS credentials
2. Explain what **providers**, **resources**, **data sources**, **variables**, **locals**, and **outputs** are, and write each of them
3. Use the core workflow: `init` → `fmt` → `validate` → `plan` → `apply` → `destroy`
4. Read a plan, and tell the difference between create (`+`), update in place (`~`), replace (`-/+`), and destroy (`-`)
5. Explain what the **state file** contains, inspect it with `terraform state` commands, and move it to a remote **S3 backend** with locking
6. Write and call a simple **module**, and use a module from the Terraform Registry
7. Apply basic best practices: pinned versions, a committed lock file, no secrets or state in Git

## Materials

| File | What it is |
|---|---|
| [terraform_guide.md](./terraform_guide.md) | The main reading and reference: concepts, workflow, state, modules, best practices, advanced concepts, troubleshooting |
| [hands-on-demo/](./hands-on-demo/) | The live class demo: a VPC and web server built up step by step, migrated to remote state, then modularized |
| [exercise/](./exercise/) | Take-home exercise: refactor a single-file Terraform script into a proper multi-environment project |

## Class Outline

1. **From last week**: Terraform was a black box. This week we open it.
2. **Core building blocks**: providers, resources, data sources, variables, locals, outputs (guide: *Core Terraform Concepts*).
3. **Live demo**: follow [hands-on-demo/README.md](./hands-on-demo/README.md)
   - Step 1: the workflow, reading a plan, and local state
   - Step 2: migrating to remote state in S3, with locking
   - Step 3: adding resources and seeing dependencies
   - Step 4: update in place vs replacement
   - Step 5: modules
   - Step 6: destroy and clean up
4. **Best practices**: project layout, version pinning, `.gitignore`, secrets, and state.
5. **Introduce the exercise.**

## After Class

1. Read [terraform_guide.md](./terraform_guide.md). The *Advanced Concepts* section (workspaces, `count`/`for_each`, conditionals) is needed for the exercise
2. Repeat the hands-on demo in your own AWS account, and **destroy everything when you're done**
3. Complete the [exercise](./exercise/README.md)
