# State and Drift: Code vs State vs Reality

A declarative IaC tool always works with **three views** of your infrastructure:

| View | Where it lives | What it represents |
|---|---|---|
| **Code** (desired state) | Your `.tf` files in Git | What you *want* to exist |
| **State** (recorded state) | `terraform.tfstate` | What the tool *last created/saw* |
| **Reality** (actual state) | The cloud provider's API | What *actually* exists right now |

When you run `terraform plan`, Terraform:
1. **Refreshes** — asks the cloud API about every resource recorded in state, and updates its picture of reality
2. **Compares** — diffs reality against your code
3. **Proposes** — lists the create/update/delete actions needed to make reality match the code

Below are the scenarios you'll see in practice. Each uses one EC2 instance.

---

## Scenario 1: Everything in sync

```
Code                              State                             Reality (AWS)
aws_instance.web {                aws_instance.web {                i-0abc123 {
  instance_type = "t3.micro"        id            = "i-0abc123"       instance_type = "t3.micro"
  tags = { Env = "dev" }            instance_type = "t3.micro"        tags = { Env = "dev" }
}                                   tags = { Env = "dev" }          }
                                  }
```

**`terraform plan`** → `No changes. Your infrastructure matches the configuration.`

This is idempotency in action: running `apply` again does nothing.

---

## Scenario 2: You change the code

```
Code                              State                             Reality (AWS)
  instance_type = "t3.small"  ←     instance_type = "t3.micro"        instance_type = "t3.micro"
```

**`terraform plan`** → `~ update in-place` (instance_type: "t3.micro" → "t3.small")

This is the normal, healthy way infrastructure changes: edit code → review plan → apply.

Some changes can't be made in place. Changing the `ami` of an instance, for example, shows
`-/+ must be replaced` — Terraform destroys the old instance and creates a new one (immutable infrastructure).

---

## Scenario 3: Someone changes reality by hand (drift)

```
Code                              State                             Reality (AWS)
  tags = { Env = "dev" }            tags = { Env = "dev" }            tags = { Env = "prod-hotfix" }  ←
```

Someone edited the tag in the AWS Console.

**`terraform plan`** → `~ update in-place` (tags.Env: "prod-hotfix" → "dev")

Terraform noticed the drift during refresh and proposes to **put reality back to what the code says**. This is
both a feature (self-correcting infrastructure) and a warning: if that console change was an important hotfix,
the next `apply` will silently undo it. The right fix is to put the change *in the code*.

> **Tip**: `terraform plan -refresh-only` shows *only* what has drifted, without proposing changes to fix it.
> `terraform apply -refresh-only` accepts reality into the state without touching the infrastructure.

---

## Scenario 4: Someone deletes a resource by hand

```
Code                              State                             Reality (AWS)
aws_instance.web { ... }          aws_instance.web {                (nothing — terminated)  ←
                                    id = "i-0abc123"
                                  }
```

**`terraform plan`** → `+ create` — the refresh finds the instance is gone, so Terraform plans to create a new one.

This is what "recover from disaster by re-running the code" looks like.

---

## Scenario 5: Something exists that Terraform doesn't know about

```
Code                              State                             Reality (AWS)
(nothing)                         (nothing)                         i-0zzz999 (created by hand)  ←
```

**`terraform plan`** → `No changes.`

Terraform only manages what's in its state. Resources created outside of it are **invisible** to it — they
won't be tracked, updated, or cleaned up. To bring them under management, write the code for them and use an
`import` block (or `terraform import`). This is why "everything through code" matters: anything created by hand
is a resource nobody is tracking.

---

## Scenario 6: You lose the state file

```
Code                              State                             Reality (AWS)
aws_instance.web { ... }          (deleted!)  ←                     i-0abc123 (still running)
```

**`terraform plan`** → `+ create` — Terraform has no memory of `i-0abc123`, so it plans to create a **second**
instance. The original keeps running (and costing money) with nothing managing it.

This is why state must be stored remotely, versioned, locked, and backed up — never just on one laptop.

---

## Summary

| Scenario | What changed | What `plan` proposes |
|---|---|---|
| 1. In sync | Nothing | No changes |
| 2. Code changed | Code | Update or replace to match code |
| 3. Manual edit | Reality | Revert reality back to code |
| 4. Manual delete | Reality | Re-create the resource |
| 5. Manual create | Reality (outside state) | Nothing — it's invisible |
| 6. State lost | State | Create duplicates |

**The golden rule: code is the source of truth. Change the code, not the console.**
