# A First Look at GitHub Actions: A Simulated Pipeline

A short tour of a CI platform. [`ci.yml`](./ci.yml) is a GitHub Actions workflow shaped like a real pipeline (lint,
test, then build), but every step only **prints** what a real one would do. There's no app to install or test, so
we can focus on how the platform works: triggers, jobs, runners, logs, and what happens when a step fails.

Next week replaces the simulated steps with real ones and adds deployment.

## Prerequisites

- A GitHub account
- `git`, and the GitHub CLI signed in (`gh auth login`). Everything below can also be done in the browser

## Step 1: Create a Repository

```bash
gh repo create ci-sim --public --add-readme --clone
cd ci-sim
```

Open it in the browser (`gh repo view --web`) and click the **Actions** tab: there's nothing to run yet.

## Step 2: Add the Workflow

GitHub runs every workflow file it finds in `.github/workflows/` at the root of the repository.

```bash
mkdir -p .github/workflows
cp <path-to-this-folder>/ci.yml .github/workflows/ci.yml
```

Open `.github/workflows/ci.yml` and walk through it:
- **`on`**: the triggers. A push to `main` (or `master`), any pull request, or a person clicking **Run workflow**
  (`workflow_dispatch`).
- **`jobs`**: `lint`, `test` and `build`. Each job runs on its own fresh virtual machine (a **runner**), set by
  `runs-on`.
- **`steps`**: run in order inside a job. `uses:` runs a published action (here, `actions/checkout` copies the
  repository onto the runner); `run:` runs shell commands.
- **`needs: [lint, test]`**: `build` waits for both, and is skipped if either fails. `lint` and `test` have no
  `needs`, so they run at the same time.
- **`${{ github.sha }}`** and friends: values GitHub fills in when the run starts.

```bash
git add .github
git commit -m "Add a simulated CI pipeline"
git push
```

In the **Actions** tab, open the run:
- The graph shows `lint` and `test` side by side, then `build` once both finish.
- Click `test`, then expand **Show where this is running**: the event (`push`), branch, commit and who started it.
- `Machine:` shows a Linux virtual machine that exists only for this job.

The pipeline is a file in the repository, so it's versioned and reviewed like any other code
(**pipeline as code**).

## Step 3: A Change Through a Pull Request

```bash
git switch -c update-readme
echo "Checked by CI on every change." >> README.md
git commit -am "Update the README"
git push -u origin update-readme
gh pr create --title "Update the README" --body "A small change to see CI run on a pull request."
```

Open the pull request in the browser. The three jobs appear as **checks** at the bottom, and update live. In the
`test` job's log, the branch shows as `1/merge`: on a pull request, GitHub tests what `main` would look like
**after** merging, not just the branch on its own.

- Reviewers see the results right on the change, without running anything themselves.
- On its own, a failed check doesn't stop anyone from merging. The repository's rules must **require** it (see
  "Protecting the main branch" in the [change management guide](../change_management_guide.md)).

Merge it:

```bash
gh pr merge --squash --delete-branch
git switch main && git pull
```

## Step 4: Make the Tests Fail

In the **Actions** tab: **CI → Run workflow**, tick **Make the test job fail**, **Run workflow**. Or:

```bash
gh workflow run CI -f fail_tests=true
gh run watch                          # pick the newest run
```

- `test` fails with `FAILED: test_checkout_total - expected 4100, got 4600`.
- `lint` still passes: it doesn't depend on `test`.
- `build` is **skipped**: there's no point building something whose tests failed.

```bash
gh run view --log-failed              # only the logs of the step that failed
```

The step failed because its command exited with a non-zero code (`exit 1`). That's how every CI
platform decides pass or fail: real test tools such as `pytest` or `npm test` exit non-zero when a test fails.

## Step 5: From Simulation to the Real Thing

| Simulated step | A real pipeline would run |
|---|---|
| Lint | `ruff check .`, `eslint .`, `terraform fmt -check` |
| Run the tests | `pytest`, `npm test`, `go test ./...` |
| Build the image | `docker build`, then push it to a registry and deploy it (Week 7) |

## Cleanup

```bash
gh auth refresh -h github.com -s delete_repo     # once: allow the CLI to delete repositories
gh repo delete ci-sim --yes
cd .. && rm -rf ci-sim
```

## Troubleshooting

| Problem | Fix |
|---|---|
| Nothing appears in the **Actions** tab | The file must be in `.github/workflows/` at the root of the repository, ending in `.yml` |
| No **Run workflow** button | The workflow must be on the default branch (`main`) first |
| `gh repo delete` fails with a missing scope | Run `gh auth refresh -h github.com -s delete_repo` first |
