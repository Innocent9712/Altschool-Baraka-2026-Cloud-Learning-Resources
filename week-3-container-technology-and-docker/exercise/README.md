# Week 3 Exercise: Dockerizing Three Small Applications

## Goal

For each of the three application setups described below, write a proper `Dockerfile` that would build a working image for that app. The applications themselves are described, not provided — you're practicing reading a project layout and translating it into a correct, sensible Dockerfile, the way you'd have to on a real team handed an undockerized repo.

There's also an **optional stretch case** at the end where you actually build one of these apps for real and take it all the way to Docker Hub.

---

## App 1 — Python (Flask): "Task Tracker API"

A small REST API for managing a to-do list, backed by an in-memory store (no database).

**Project layout:**
```
task-tracker-api/
├── app.py              # Flask app, defines routes, entry point
├── requirements.txt    # Flask, gunicorn
└── tasks/
    └── store.py         # in-memory task storage logic
```

- Runs on port `5000`.
- In development it's run with `flask run`, but in the image it should be served by `gunicorn` (already in `requirements.txt`), not the Flask dev server.
- No system-level dependencies beyond what pip installs.
- Reads one environment variable, `LOG_LEVEL`, defaulting to `info` if not set.

**Your Dockerfile should:** install dependencies from `requirements.txt`, copy in the app code, expose the right port, and start the app via `gunicorn` (e.g. binding to `0.0.0.0:5000`).

---

## App 2 — Node.js (Express): "Notes App"

A small Express API for creating and retrieving text notes, storing them in a local SQLite file.

**Project layout:**
```
notes-app/
├── index.js
├── package.json
├── package-lock.json
└── routes/
    └── notes.js
```

- `package.json` has a `start` script (`node index.js`) and lists `express` and `sqlite3` as dependencies.
- Runs on port `3000`.
- Needs its dependencies installed reproducibly from the lockfile (not just whatever `npm install` resolves at build time).
- No build/compile step — it's plain JavaScript, nothing to transpile.

**Your Dockerfile should:** install dependencies in a way that respects `package-lock.json` exactly, copy in the app code, expose the right port, and start the app via the `start` script.

---

## App 3 — Go: "URL Shortener"

A small Go HTTP service that shortens URLs and redirects on lookup, storing mappings in memory.

**Project layout:**
```
url-shortener/
├── main.go
├── go.mod
└── go.sum
```

- Compiles to a single static binary.
- Runs on port `8080`.
- Has no runtime dependencies once compiled — it doesn't need Go, `gcc`, or any package manager present in the final running container.

**Your Dockerfile should:** compile the binary in one stage, then produce a final image that contains *only* the compiled binary and whatever minimal OS layer it needs to run — not the Go toolchain, not the source code.

---

## Pointers for all three Dockerfiles

Keep these in mind regardless of which app you're writing for:

- **Pin your base image version.** `python:3.13-slim`, not `python:latest`. Same for `node` and `golang`. Untagged `latest` images silently change under you.
- **Copy dependency manifests before copying the rest of the source.** e.g. `COPY requirements.txt .` / `COPY package*.json .` / `COPY go.mod go.sum .`, then install, *then* `COPY . .`. This lets Docker cache the dependency-install layer so it isn't repeated on every source code change.
- **Multi-stage builds matter most for Go.** A `golang:*` image is large and contains a full toolchain you don't need at runtime. Build in one stage, copy just the binary into a minimal final stage (e.g. `alpine` or `scratch`).
- **Use a `.dockerignore` file.** Exclude things like `.git`, `node_modules`, `__pycache__`, `*.pyc`, local `.env` files, and (for Go) any local build artifacts. Anything you wouldn't `git add` probably shouldn't be sent to the Docker build context either.
- **Don't run as root.** Create a non-root user in the image and switch to it (`USER`) before the final `CMD`.
- **Use exact, reproducible installs where the language supports it.** `npm ci` instead of `npm install`, `pip install --no-cache-dir -r requirements.txt` instead of a bare `pip install`.
- **`EXPOSE` the actual port the app listens on**, and make sure your `CMD`/`ENTRYPOINT` actually binds to `0.0.0.0`, not `127.0.0.1` — a common reason "it works outside Docker but not inside."
- **Prefer `CMD` in exec form** (`CMD ["gunicorn", "app:app"]`) over shell form (`CMD gunicorn app:app`) so signals like `SIGTERM` reach your process properly.
- **Keep image size in mind.** Slim/alpine base images where practical; avoid installing build tools in your final stage if you don't need them there.

## Deliverable

Three Dockerfiles, one per app, in folders matching the layouts above (you don't need the actual source files for the required part — just the Dockerfile assuming that layout exists). Be ready to explain any choice you made — e.g. why you picked `alpine` vs `slim`, or why a particular `COPY` comes before or after the install step.

---

## Optional stretch case: build it for real

Pick **one** of the three apps above (Task Tracker API or Notes App are the more approachable choices for this). This time, actually build it out end-to-end:

1. **Build the app.** Use an AI coding assistant (or write it yourself) to generate a minimal, genuinely working version of the app matching the spec above — real routes, real responses, nothing elaborate.
2. **Run it locally, without Docker.** Confirm it behaves as expected — hit the endpoints with `curl` or a browser, check it does what it's supposed to.
3. **Build the Docker image** using the Dockerfile you wrote (or adjust it once you see it against a real codebase — it's fine if it needs small fixes):
   ```
   docker build -t <your-dockerhub-username>/<app-name>:v1 .
   ```
4. **Run the container** and confirm it behaves the same as the local run:
   ```
   docker run -p <host-port>:<container-port> <your-dockerhub-username>/<app-name>:v1
   ```
   Hit the same endpoints you tested locally and confirm matching behavior.
5. **Push the image to Docker Hub:**
   ```
   docker login
   docker push <your-dockerhub-username>/<app-name>:v1
   ```
   On an Apple Silicon Mac, your image is `linux/arm64` only. To make it run on typical `linux/amd64` servers too, build and push a multi-platform image instead:
   ```
   docker buildx build --platform linux/amd64,linux/arm64 -t <your-dockerhub-username>/<app-name>:v1 --push .
   ```
6. **Prove it's real.** Remove the local image (`docker rmi`), then `docker pull` it back down fresh from Docker Hub, run it again, and confirm it still works. This step matters — it's the difference between "it works because it's cached on my machine" and "it actually works as a shipped image."

If something breaks between local-run and container-run (very common — port binding, missing env var, a file path that only exists on your machine), that's the most useful part of the exercise: figure out why, fix the Dockerfile or the app, and note what caused it.

## Submitting your work for review

   Use Pull Requests (PRs) to present your changes incrementally. Follow this branching strategy:

   ```
   feature/name-of-the-feature -> review -> main
   ```

   - Create a **feature branch** for each piece of work (e.g. `feature/flask-dockerfile`, `feature/go-multistage`).
   - When a feature is complete, merge it into a **`review`** branch.
   - Once you're ready for feedback, open a PR from `review` → `main` and request a review.
   - Reviews will be provided as comments on that PR. You can address feedback on new fix/feature branches, merge them into the open PR, and request another round of review — or merge directly to `main` if you prefer.

   When submitting, provide links to your PRs so the progression of changes is easy to follow.