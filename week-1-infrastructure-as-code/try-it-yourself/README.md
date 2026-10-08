# Try It Yourself: Imperative vs Declarative (no cloud account needed)

This exercise repeats the live demo on your own machine, using **text files instead of servers**. It's free and shows the same behaviour you saw in class.

Think of the `servers/` folder as your "cloud account" and each line in a file as a "server".

## Prerequisites

- Terraform installed ([install guide](https://developer.hashicorp.com/terraform/install)), so that `terraform version` works
- A Bash shell (macOS/Linux terminal, Git Bash, or WSL on Windows)

## Part 1 — Imperative

```bash
./imperative.sh
./imperative.sh
./imperative.sh
cat servers/inventory.txt
```

**Before you run it, predict**: how many "servers" will be in the inventory?

> **Question 1**: Is `imperative.sh` idempotent? How would you change it so it is?

## Part 2 — Declarative

```bash
terraform init
terraform plan
terraform apply          # type "yes"
cat servers/declared-inventory.txt
```

Now run `terraform apply` **two more times**.

> **Question 2**: How many "servers" are in `declared-inventory.txt`? What did Terraform print on the 2nd and 3rd apply? Why?

## Part 3 — State

Run `ls`. A new file, `terraform.tfstate`, has appeared. Open it in an editor and look around (don't change it).

> **Question 3**: What do you think Terraform uses this file for? What would happen if you deleted it and ran `terraform apply` again?
> (Hint: Scenario 6 in [state-and-drift.md](../state-and-drift.md).)

## Part 4 — Change the code

Say we now want a large server instead of a small one:

```bash
terraform apply -var size=large      # type "yes"
cat servers/declared-inventory.txt
```

> **Question 4**: How many "servers" are in the inventory now, and what size are they? How would you make `imperative.sh` do the same thing?

## Part 5 — Drift

Simulate someone making a change "in the console". Open `servers/declared-inventory.txt` in an editor and change
`size=small` to `size=huge`. Save it, then:

```bash
terraform plan
terraform apply
cat servers/declared-inventory.txt
```

> **Question 5**: What did Terraform do to your manual change? Is that good or bad? When might it be bad?

Now delete the file completely (`rm servers/declared-inventory.txt`) and run `terraform plan` again.

> **Question 6**: What does Terraform propose? What's the real-world equivalent of this?

## Part 6 — Clean up

```bash
terraform destroy
rm -rf servers .terraform .terraform.lock.hcl terraform.tfstate*
```

> **Question 7**: Which inventory did `terraform destroy` remove, and which one did it leave alone? Why?
> (Hint: Scenario 5 in [state-and-drift.md](../state-and-drift.md).)
