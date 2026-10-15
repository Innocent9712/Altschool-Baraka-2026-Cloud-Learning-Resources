# Docker Hands-On Demo: From `docker run` to Docker Compose

This folder contains a small **FastAPI + PostgreSQL** app (a users API) that we containerize step by step:

1. Containers are just isolated processes
2. Images and containers: running nginx
3. Writing a Dockerfile and building an image
4. Running our image, and why it fails on its own
5. Networks: connecting the app to a database
6. Volumes: keeping data when containers are deleted
7. A better Dockerfile: multi-stage, non-root, health check
8. Docker Compose: the whole stack in one file
9. Sharing the image through a registry

As in previous weeks, ask the class to **predict** what will happen before running each command.

## Prerequisites

- **Docker** installed and running: Docker Desktop (macOS/Windows) or Docker Engine (Linux). Check with `docker version` and `docker compose version`.
- `curl` (or just use a browser)
- Optional: [`uv`](https://docs.astral.sh/uv/) to run the app *without* Docker for comparison
- Pull the images before class so you aren't waiting on downloads: `docker pull nginx:alpine && docker pull alpine:3.22 && docker pull postgres:18-alpine && docker pull python:3.13-slim`

## Files

| File | Purpose |
|---|---|
| `main.py` | The FastAPI app: `/health`, `/users` (list, create, get, delete), `/docs` |
| `pyproject.toml`, `uv.lock` | Python dependencies, with exact versions locked |
| `Dockerfile.simple` | A first, single-stage Dockerfile |
| `Dockerfile` | The improved version: multi-stage, non-root user, health check |
| `.dockerignore` | Files that are never sent to the Docker build |
| `compose.yaml` | The app and database defined together for Docker Compose |
| `.env.example` | Example environment variables. Copy it to `.env` |

All commands below are run from this folder.

---

## Step 1: Containers Are Just Isolated Processes

Connect the theory (namespaces and cgroups) to something you can see.

```bash
docker run -d --name sleeper alpine:3.22 sleep 300

# Inside the container: our process is PID 1, and it's the only one
docker exec sleeper ps

# From the host's side: the same process with a normal, large PID
docker top sleeper

# Its own hostname (UTS namespace): the container ID
docker exec sleeper hostname

docker rm -f sleeper
```

**Point**: There's no "guest OS" booting. A container is a normal process that the kernel shows a restricted view of the system (PID, network, mount, and hostname namespaces).

Now cgroups:

```bash
# Limit memory to 64 MB, then read the limit the kernel enforces
docker run --rm --memory=64m alpine:3.22 cat /sys/fs/cgroup/memory.max
# 67108864  (= 64 MB)
```

> On macOS/Windows, Docker Desktop runs containers inside a small Linux VM, so `docker top` shows PIDs from inside that VM. Containers need a Linux kernel.

---

## Step 2: Images and Containers

```bash
docker pull nginx:alpine
docker image ls

docker run -d --name web1 -p 8080:80 nginx:alpine
docker ps
```

Open http://localhost:8080. **Explain** `-p 8080:80`: host port 8080 forwards to port 80 inside the container.

**Ask**: *"Can I run a second one from the same image?"*

```bash
docker run -d --name web2 -p 8081:80 nginx:alpine
docker ps
```

**Point**: One image (the template) can be used for many containers (running instances). Each one gets its own filesystem, network, and process.

```bash
docker logs web1                       # what nginx printed (your page visits)
docker exec -it web1 sh                # a shell inside the container; try: ls /usr/share/nginx/html, then exit
docker stop web1 web2
docker ps -a                           # stopped containers still exist...
docker rm web1 web2                    # ...until removed
```

---

## Step 3: Writing a Dockerfile and Building an Image

Open `Dockerfile.simple` and walk through each instruction: `FROM`, `COPY`, `WORKDIR`, `RUN`, `ENV`, `EXPOSE`, and `CMD`. Point out:
- **Pinned base image** (`python:3.13-slim`, not `latest`)
- **Dependencies are copied and installed before the code**, so that layer is cached
- **`--host 0.0.0.0`**: the most common reason for "it works on my machine but not in Docker"

Also open `.dockerignore`. It keeps `.venv`, `.git`, and `.env` (secrets) out of the image.

```bash
docker build -f Dockerfile.simple -t demo-app:simple .
docker image ls demo-app
docker history demo-app:simple       # each instruction = a layer
```

**Layer caching.** Make a trivial change to `main.py` (e.g. edit the `title=` text), then rebuild:

```bash
docker build -f Dockerfile.simple -t demo-app:simple .
```

**Ask**: *"Which steps will run again?"* Only the `COPY main.py` step and the ones after it. The dependency install shows `CACHED`. Now imagine the order was `COPY . .` first: every code change would reinstall every dependency.

Undo the change to `main.py`.

---

## Step 4: Running Our Image, and Why It Fails on Its Own

**Ask**: *"What happens if we just run it?"*

```bash
docker run --rm -p 8000:8000 demo-app:simple
```

It fails with `KeyError: 'DATABASE_URL'`. The app needs configuration, and in containers configuration comes from **environment variables**.

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql://appuser:change-me@postgres-db:5432/appdb \
  demo-app:simple
```

It fails again: `failed to resolve host 'postgres-db'`. There's no database yet, and even if there were, our container needs a way to find it. That's what networks are for.

---

## Step 5: Networks, Connecting the App to a Database

```bash
# A user-defined network gives containers DNS: they can reach each other BY NAME
docker network create app-network

docker run -d --name postgres-db --network app-network \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=change-me \
  -e POSTGRES_DB=appdb \
  -v pgdata:/var/lib/postgresql \
  postgres:18-alpine

docker logs postgres-db     # wait for "database system is ready to accept connections"

docker run -d --name demo-app --network app-network \
  -e DATABASE_URL=postgresql://appuser:change-me@postgres-db:5432/appdb \
  -p 8000:8000 \
  demo-app:simple
```

Try it:

```bash
curl localhost:8000/health
curl -X POST localhost:8000/users -H "Content-Type: application/json" \
  -d '{"name": "Ada Lovelace", "email": "ada@example.com"}'
curl localhost:8000/users
```

Also open http://localhost:8000/docs (interactive API docs).

**Points**:
- `postgres-db` in the URL is the **container name**, resolved by Docker's DNS on the user-defined network. The default bridge network doesn't provide this.
- The database has **no `-p`**: only the app can reach it, over the private network. Nothing on your machine or the internet can.
- `/health` returns a `hostname`: the container ID of the container that answered.

```bash
docker network inspect app-network   # both containers and their private IPs
```

---

## Step 6: Volumes, Keeping Data When Containers Are Deleted

We started Postgres with `-v pgdata:/var/lib/postgresql`. Let's see why.

**Ask**: *"If I delete the database container and create a new one, is Ada still there?"*

```bash
docker rm -f postgres-db

docker run -d --name postgres-db --network app-network \
  -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=appdb \
  -v pgdata:/var/lib/postgresql \
  postgres:18-alpine

curl localhost:8000/users     # Ada is still there (give the database a few seconds to start)
```

**Point**: The data lives in the **named volume** `pgdata`, not in the container. Containers are disposable; volumes are not.

Now without a volume:

```bash
docker rm -f -v postgres-db     # -v also removes the container's anonymous volumes

docker run -d --name postgres-db --network app-network \
  -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=appdb \
  postgres:18-alpine

docker restart demo-app        # the app creates its table on startup
curl localhost:8000/users      # []  (everything is gone)
```

```bash
docker volume ls
```

---

## Step 7: A Better Dockerfile

Open `Dockerfile` and compare it with `Dockerfile.simple`:
- **Multi-stage build**: dependencies are installed in a `builder` stage, and only the finished `.venv` is copied into the final image. Install tools never ship.
- **Non-root user** (`USER appuser`)
- **`HEALTHCHECK`**: Docker regularly checks that `/health` responds

```bash
docker build -t demo-app:v1 .
docker image ls demo-app                 # compare the sizes

docker run --rm demo-app:simple whoami   # root
docker run --rm demo-app:v1 whoami       # appuser
```

Swap the running app for the new image:

```bash
docker rm -f demo-app
docker run -d --name demo-app --network app-network \
  -e DATABASE_URL=postgresql://appuser:change-me@postgres-db:5432/appdb \
  -p 8000:8000 \
  demo-app:v1

docker ps      # STATUS shows "(health: starting)", then "(healthy)"
```

**Point on size**: here the saving is modest (roughly 30 MB, mostly the uv tool), because our dependencies come as pre-built packages. Multi-stage builds matter most when the build needs heavy tools such as compilers or a full SDK. For example, a Go app can go from a 1 GB+ build image to a final image of a few MB (see this week's exercise).

**Clean up the manual setup before moving on:**

```bash
docker rm -f demo-app postgres-db
docker network rm app-network
docker volume rm pgdata
```

---

## Step 8: Docker Compose, the Whole Stack in One File

**Ask**: *"How many commands did that take, and would a new teammate get them all exactly right?"*

Open `compose.yaml`. Map each part to the commands we typed: services ≈ `docker run`, `volumes:` ≈ `-v`, and the network is created automatically. Also note `depends_on` with `condition: service_healthy`.

```bash
cp .env.example .env            # Compose substitutes ${POSTGRES_USER} etc. from .env
docker compose up --build -d
docker compose ps
docker compose logs -f app      # Ctrl+C to stop following

curl -X POST localhost:8000/users -H "Content-Type: application/json" \
  -d '{"name": "Grace Hopper", "email": "grace@example.com"}'
curl localhost:8000/users
```

**Ask**: *"After `docker compose down`, will Grace still be there?"*

```bash
docker compose down             # removes containers and network, KEEPS volumes
docker compose up -d
curl localhost:8000/users       # Grace is still there

docker compose down -v          # -v deletes the volumes too: data is gone
```

**Point**: Compose is declarative, like Terraform. The file describes the stack, and `up` makes it so. Compose is for a single machine. Running containers across many machines is what Kubernetes does (next week).

---

## Step 9: Sharing the Image Through a Registry (optional)

An image on your laptop is only useful to you. Registries (Docker Hub, GitHub Container Registry, Amazon ECR, ...) are how images are shared and deployed.

```bash
docker login                                              # Docker Hub account
docker tag demo-app:v1 <your-dockerhub-username>/demo-app:v1
docker push <your-dockerhub-username>/demo-app:v1
```

**Apple Silicon (M1–M4) note**: images built on an ARM Mac are `linux/arm64`. Most cloud servers are `linux/amd64`. Build for both with:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub-username>/demo-app:v1 --push .
```

---

## Cleanup

```bash
docker compose down -v
docker rm -f demo-app postgres-db sleeper web1 web2 2>/dev/null
docker network rm app-network 2>/dev/null
docker volume rm pgdata 2>/dev/null
docker image rm demo-app:simple demo-app:v1 demo-app:compose
```

Avoid `docker system prune -a` on a machine with other projects: it deletes **every** unused image, not just this demo's.

## Running the App Without Docker (optional comparison)

```bash
cp .env.example .env
docker run -d --name local-db -p 5432:5432 \
  -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=appdb postgres:18-alpine
uv sync
uv run python main.py      # http://localhost:8000/docs
docker rm -f -v local-db
```

Here the app runs on your machine and talks to the database through the published port on `localhost`. Compare that with Step 5, where the container used the name `postgres-db` on a Docker network. `/health` now reports your computer's hostname instead of a container ID.

If port 5432 is already in use (e.g. you have PostgreSQL installed locally), publish a different one with `-p 5433:5432` and change `localhost:5432` to `localhost:5433` in `.env`.
