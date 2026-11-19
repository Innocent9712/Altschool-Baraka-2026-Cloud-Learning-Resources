# Week 7 Exercise: Your Own Pipeline, From Pull Request to Production

## Goal

Build the class demo's pipeline in your own repository, deploying to your own server, then improve it in three
small ways. Every change goes through a pull request, so your repository's history shows the work.

## What You'll Need

- Everything in the [hands-on demo's prerequisites](../hands-on-demo/README.md#prerequisites)
- The demo's files, from `week-7-cicd-hands-on/hands-on-demo/`

## Requirements

### 1. The Pipeline Working End to End

Follow the hands-on demo, Steps 1 to 7, in a **public** repository of your own:
- `main` protected by a ruleset requiring `lint` and `test`
- the server created with `server/main.tf`
- the `staging` and `production` environments, with a required reviewer on `production`
- the `STUDENT15` change deployed to staging, then approved to production

### 2. Smoke Test the Image Before Pushing It

Right now `build` pushes the image without ever starting it. Change the `build` job so that it:
1. builds the image and loads it onto the runner (`load: true`) without pushing,
2. starts it and checks that `/health` answers,
3. only then pushes it.

Prove it works with a pull request that breaks the app's startup while the tests still pass (for example, a typo in
the `CMD` line of the `Dockerfile`). Merge it, show that `build` fails and nothing is deployed, then fix it in a
second pull request.

### 3. CI for the Server's Terraform Code

Add `.github/workflows/terraform.yml` that runs on pull requests that change `server/` (and only those), with:
- `terraform fmt -check`
- `terraform init -backend=false` and `terraform validate`

Prove it with a pull request that leaves `server/main.tf` badly formatted. Fix it before merging.

### 4. A Rollback Button

Add `.github/workflows/rollback.yml`, started by hand (`workflow_dispatch`), with an input for the commit SHA to go
back to. It deploys `ghcr.io/<owner>/<repo>:<that SHA>` to **production**, through the `production` environment, so
it still needs an approval. Check the deployment the same way the pipeline does.

Use it once, and show `/health` reporting the older version.

## Questions to Answer in Your README

1. Which jobs ran on your pull requests, and which ran after merging? Why the difference?
2. Your image is tagged with the commit SHA. How does that help when something goes wrong in production?
3. Where is the SSH private key stored, and who can read it? What would you do if it leaked?
4. In Requirement 2, why should the smoke test happen **before** the push rather than after?
5. Your rollback workflow and re-running an old deployment job both bring back an older version. When would you use
   each? Why is neither the end of the story?
6. What would change in your pipeline to move from continuous delivery to continuous deployment? Would you do it for
   this app? Why or why not?

## Deliverable

A link to your GitHub repository, containing:
- the app, `.github/workflows/pipeline.yml`, `terraform.yml` and `rollback.yml`
- a `README.md` with: the staging and production URLs (while the server runs), a short description of each job,
  links to the pull requests and runs for each requirement, screenshots of the production approval and the
  rollback, and your answers to the questions above
- **no secrets, and no Terraform state.** The deploy key lives only in `~/.ssh` and in the repository's secrets

**Destroy the server when you're done** (`terraform -chdir=server destroy`), after taking your screenshots.

## Submitting Your Work for Review

Use Pull Requests (PRs) to present your changes incrementally. Follow this branching strategy:

```
feature/name-of-the-feature -> review -> main
```

- Create a **feature branch** for each piece of work (e.g. `feature/smoke-test`, `feature/terraform-ci`,
  `feature/rollback`).
- When a feature is complete, merge it into a **`review`** branch.
- Once you're ready for feedback, open a PR from `review` → `main` and request a review.
- Reviews will be provided as comments on that PR. You can address feedback on new fix/feature branches, merge them
  into the open PR, and request another round of review, or merge directly to `main` if you prefer.

The pull requests that prove Requirements 2 and 3 go straight from their feature branch into `main`, so the
pipeline and the ruleset apply to them. When submitting, provide links to your PRs so the progression of changes is
easy to follow.
