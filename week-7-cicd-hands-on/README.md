# Week 7: CI/CD Hands-on

Last week covered why changes need managing and what a CI platform does. This week we build a full pipeline:
connect a repository to GitHub Actions, test every change automatically, and deliver merged changes to a staging
and a production environment.

**By the end of the week** you'll have taken a change from a pull request to production through a pipeline you
built, with an approval before production and a way to roll back.

## Learning Objectives

By the end of this week, you should be able to:

1. Connect a repository to a CI/CD pipeline that runs on pull requests and on merges to `main`
2. Make checks required before merging, with a ruleset
3. Use `needs`, `if` and job outputs to run CI on pull requests and CD on `main` in one workflow
4. Store credentials as secrets and settings as variables, and limit what the run's token can do
5. Build an image once, push it to a registry, and promote that same image through environments
6. Use GitHub environments to give each deployment its own settings and protection rules, such as a required
   reviewer
7. Check that a deployment worked, and roll back to a previous version
8. Compare push deployments with GitOps, and long-lived cloud keys with OIDC
9. Describe a pipeline for infrastructure code: plan on the pull request, apply after approval

## Materials

| File | What it is |
|---|---|
| [cicd_pipelines_guide.md](./cicd_pipelines_guide.md) | From CI to CD, workflows in more depth, secrets, registries, environments, ways to deploy, cloud credentials, rollbacks, pipelines for Terraform |
| [hands-on-demo/](./hands-on-demo/) | A pipeline for a small API: lint and test, then build, push and deploy to staging and production on an EC2 server |
| [exercise/](./exercise/) | Build the pipeline yourself, then add an image smoke test, Terraform CI and a rollback button |

## Class Outline

1. **From CI to CD**: what changes once a pipeline delivers, build once and deploy many, delivery or deployment.
2. **Hands-on, part 1**: connect the repository, run CI on every change, and protect `main`.
3. **Secrets, variables and environments**: where credentials live, and how environments separate staging from
   production.
4. **Hands-on, part 2**: build, push and deploy to staging, approve production, ship a change, roll it back.
5. **Beyond the demo**: other deployment targets, GitOps, OIDC, and pipelines for Terraform.

## After Class

1. Read the [CI/CD pipelines guide](./cicd_pipelines_guide.md) and answer its *Check Your Understanding* questions
2. Complete the [exercise](./exercise/)
3. **Destroy your server** when you're done with it: `terraform -chdir=server destroy`
