# Week 6: Managing Change & Continuous Integration Platforms

Most outages start with a change: new code, a configuration edit, an infrastructure update. This week looks at how
teams change their systems often without breaking them (**change management**), and at the tools that check every
change automatically before it lands (**continuous integration platforms**).

**By the end of the week** you'll understand the role of continuous integration in a modern development workflow,
and how a CI platform such as GitHub Actions automates basic build and testing steps. Next week you'll build a full
CI/CD pipeline hands-on.

## Learning Objectives

By the end of this week, you should be able to:

1. Explain why changes cause most incidents, and list the principles that make a change safe
2. Describe the stages a change goes through, from request to review
3. Compare traditional change approval (change advisory boards) with peer review plus automated checks
4. Explain how branches, pull requests and protected branches manage change in Git
5. Describe release techniques that limit the impact of a bad change: rolling updates, blue-green, canary releases
   and feature flags
6. Name the four DORA metrics and what they measure
7. Explain continuous integration, and how it differs from continuous delivery and continuous deployment
8. Describe the parts of a CI platform: pipeline file, triggers, jobs, steps, runners and status checks
9. Compare the main CI platforms (GitHub Actions, GitLab CI/CD, Jenkins and others) and choose one for a team
10. Read a simple GitHub Actions workflow and explain what happens when a step fails

## Materials

| File | What it is |
|---|---|
| [change_management_guide.md](./change_management_guide.md) | Why change management matters, kinds of change, safe-change principles, the change lifecycle, CABs versus automated checks, Git and pull requests, safe releases, DORA metrics |
| [ci_platforms_guide.md](./ci_platforms_guide.md) | What CI is, pipeline stages, how CI platforms work, the main platforms compared, the same pipeline on four platforms, choosing a platform |
| [hands-on-demo/](./hands-on-demo/) | A first look at GitHub Actions with a simulated pipeline |

## Class Outline

1. **Change management**: why changes break things, the principles of safe change, the change lifecycle, and how
   CABs compare with peer review plus automated checks.
2. **Changes in Git**: branches, pull requests, protected branches, and releasing safely.
3. **Continuous integration**: what it is, what a pipeline does, and how CI platforms work.
4. **CI platforms compared**: GitHub Actions, GitLab CI/CD, Jenkins and others, and how to choose.
5. **A first look at GitHub Actions**: follow [hands-on-demo/README.md](./hands-on-demo/README.md).

## After Class

1. Read both guides and answer their *Check Your Understanding* questions
2. Repeat the hands-on demo in your own GitHub repository
