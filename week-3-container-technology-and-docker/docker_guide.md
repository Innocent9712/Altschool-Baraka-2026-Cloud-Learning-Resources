# Docker: A Practical Guide

## What is Docker?

Docker is a platform that uses containerization technology to package applications and their dependencies into lightweight, portable containers. Think of containers as standardized shipping containers for software - they ensure your application runs the same way regardless of where it's deployed.

## Key Benefits

- **Consistency**: Applications run identically across different environments
- **Portability**: Move applications seamlessly between development, testing, and production
- **Efficiency**: Containers share the host OS kernel, making them more resource-efficient than virtual machines
- **Isolation**: Applications run in isolated environments without interfering with each other

> For *how* containers work under the hood (namespaces, cgroups, runtimes), see [containerization_guide.md](./containerization_guide.md).

## Core Docker Components

### 1. Docker Images
Images are read-only templates used to create containers. They contain everything needed to run an application: code, runtime, system tools, libraries, and settings.

```bash
# Pull an image from Docker Hub
docker pull nginx:1.29-alpine

# List local images
docker image ls        # same as: docker images

# Show an image's layers
docker history nginx:1.29-alpine

# Remove an image
docker image rm nginx:1.29-alpine        # same as: docker rmi
```

#### Image names, tags, and digests

`ghcr.io/my-org/my-app:1.4.2` breaks down as **registry** (`ghcr.io`, default: Docker Hub) / **repository** (`my-org/my-app`) : **tag** (`1.4.2`, default: `latest`).

- **Tags are movable labels.** `nginx:latest` today and `nginx:latest` next month can be different images. Pin a specific version in Dockerfiles and deployments.
- **Digests are permanent.** `nginx@sha256:4f1c...` always refers to exactly the same image content. Use them when you need a guarantee.

#### Layers

An image is a stack of read-only **layers**, roughly one per Dockerfile instruction that changes the filesystem. Layers are shared between images (ten images built `FROM python:3.13-slim` store that base only once) and cached between builds.

### 2. Docker Containers
Containers are running instances of Docker images. They're lightweight, executable packages that include everything needed to run an application.

```bash
# Run a container in the background (-d), publishing host port 8080 -> container port 80
docker run -d --name web -p 8080:80 nginx:1.29-alpine

# Run interactively and remove it automatically on exit
docker run -it --rm alpine:3.22 sh

# Pass configuration as environment variables
docker run -d -e APP_ENV=production -e LOG_LEVEL=info my-app:1.0

# List running containers (add -a to include stopped ones)
docker ps

# Inspect and debug
docker logs -f web            # follow the container's output
docker exec -it web sh        # open a shell inside a running container
docker inspect web            # full configuration as JSON (IP, mounts, env, ...)
docker stats                  # live CPU / memory usage

# Stop and remove
docker stop web
docker rm web                 # or: docker rm -f web (stop + remove)
```

**Container lifecycle:** `created → running → stopped (exited) → removed`. A stopped container still exists, along with its writable layer, until you `docker rm` it.

### 3. Docker Engine
The core runtime that manages containers, images, networks, and volumes. It consists of:
- **Docker Daemon**: Background service that manages Docker objects
- **Docker CLI**: Command-line interface for interacting with Docker
- **REST API**: Interface for programmatic interaction

## Working with Dockerfiles

A Dockerfile is a text file containing instructions to build a Docker image. Instructions that change the filesystem (`RUN`, `COPY`, `ADD`) each create a new layer.

### Common Dockerfile Instructions

```dockerfile
# Base image: pin a version, never rely on "latest"
FROM node:24-alpine

# Set working directory (created if missing)
WORKDIR /app

# Set environment variables (available at build time AND run time)
ENV NODE_ENV=production

# Copy ONLY the dependency manifests first...
COPY package.json package-lock.json ./

# ...and install. This layer stays cached until the manifests change.
# `npm ci` installs exactly what's in package-lock.json
RUN npm ci --omit=dev

# Copy the rest of the source code LAST (it changes most often)
COPY . .

# Run as the unprivileged user the node image provides
USER node

# Document the port the app listens on
EXPOSE 3000

# The command to run (exec form, so signals reach the process)
CMD ["node", "index.js"]
```

| Instruction | Purpose |
|---|---|
| `FROM` | Base image to build on (every Dockerfile starts with one) |
| `WORKDIR` | Working directory for the following instructions and for the running container |
| `COPY` | Copy files from the build context into the image (prefer it over `ADD`) |
| `RUN` | Run a command at **build** time (install packages, compile) |
| `ENV` | Set environment variables for build and run time |
| `ARG` | A variable available only at **build** time (`docker build --build-arg VERSION=1.2`) |
| `EXPOSE` | Documents the port the app listens on (doesn't publish it, which is what `-p` does) |
| `USER` | Run the following instructions and the container as this user |
| `CMD` | Default command when the container starts (easy to override: `docker run image other-command`) |
| `ENTRYPOINT` | The fixed executable. `CMD` then supplies its default arguments |
| `HEALTHCHECK` | A command Docker runs periodically to check the app is working |

### Layer Caching: Order Matters

Docker reuses a cached layer if the instruction **and everything before it** is unchanged. As soon as one layer changes, every later layer is rebuilt. So order instructions from *least* to *most* frequently changing:

```dockerfile
# Bad: any code change invalidates the cache, so every build reinstalls all dependencies
COPY . .
RUN npm ci

# Good: dependencies are reinstalled only when package*.json changes
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

### `.dockerignore`

The **build context** (the directory you pass to `docker build`, usually `.`) is sent to the builder. A `.dockerignore` file excludes files from it, which keeps builds fast and keeps secrets out of images:

```
.git
node_modules
.venv
__pycache__
.env
*.log
```

### `CMD` vs `ENTRYPOINT`, and Exec Form vs Shell Form

```dockerfile
# Exec form (recommended): the process runs as PID 1 and receives signals like SIGTERM from `docker stop`
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]

# Shell form: runs via /bin/sh -c, which may not forward signals, so containers can take 10s to stop
CMD uvicorn main:app --host 0.0.0.0
```

```dockerfile
# ENTRYPOINT + CMD: the image behaves like a command, and CMD holds the default arguments
ENTRYPOINT ["curl"]
CMD ["--help"]
# docker run my-curl                        -> curl --help
# docker run my-curl https://example.com    -> curl https://example.com
```

> **Bind to `0.0.0.0`, not `127.0.0.1`.** Inside a container, `127.0.0.1` means "only from inside this container". This is the most common cause of "it works locally but not in Docker".

### Building Images

```bash
# Build an image from Dockerfile
docker build -t my-app:v1.0 .

# Build with custom Dockerfile name
docker build -f Dockerfile.prod -t my-app:prod .

# Build only up to a named stage of a multi-stage Dockerfile
docker build --target builder -t my-app:builder .

# Ignore the cache and rebuild every layer
docker build --no-cache -t my-app:v1.0 .
```

### Multi-Platform Builds

Images are built for a CPU architecture. Apple Silicon Macs build `linux/arm64` images by default, while most cloud servers run `linux/amd64`. An arm64-only image fails on an amd64 server with `exec format error`. Use `buildx` to build for both:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t username/my-app:1.0 --push .
```

## Docker Compose

Docker Compose is a tool for defining and running multi-container Docker applications using a YAML file (`compose.yaml`; the older name `docker-compose.yml` also works).

> **Modern Compose:** Use `docker compose` (a space, Compose v2+, built into the Docker CLI). The old standalone `docker-compose` (hyphen, v1) is discontinued. The top-level `version:` key is obsolete and can be removed: Compose ignores it and prints a warning.

### Basic compose.yaml Structure

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      database:
        condition: service_healthy   # wait until the healthcheck passes, not just until it starts

  database:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: ${DB_USER}           # values substituted from a .env file next to compose.yaml
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql       # PostgreSQL 18+ (older versions used /var/lib/postgresql/data)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d myapp"]
      interval: 5s
      retries: 10

volumes:
  db_data:
```

Services reach each other **by service name**: the `web` service connects to the database at host `database`, port 5432. No `ports:` mapping is needed for that. `ports:` only matters for access from *outside* (your browser, your machine).

### Common Docker Compose Commands

```bash
# Start services in the background
docker compose up -d

# Rebuild images, then start
docker compose up --build -d

# View running services
docker compose ps

# View / follow logs
docker compose logs -f web

# Run a command in a running service
docker compose exec database psql -U user -d myapp

# Stop and remove containers and networks (volumes are kept)
docker compose down

# ...and delete named volumes too (data loss!)
docker compose down -v

# Check the final configuration after variable substitution
docker compose config
```

## Image Repositories

### Docker Hub
The default public registry for Docker images.

```bash
# Push to Docker Hub
docker tag my-app:1.0 username/my-app:1.0
docker push username/my-app:1.0

# Pull from Docker Hub
docker pull username/my-app:1.0
```

### Private Registries
Organizations often use private registries for proprietary images: GitHub Container Registry (`ghcr.io`), Amazon ECR, Google Artifact Registry, Azure Container Registry, or self-hosted Harbor.

```bash
# Log in first, e.g. to GitHub Container Registry (use a personal access token as the password)
docker login ghcr.io -u your-github-username

# Tag for private registry
docker tag my-app:1.0 myregistry.com/my-app:1.0

# Push to private registry
docker push myregistry.com/my-app:1.0

# Pull from private registry
docker pull myregistry.com/my-app:1.0
```

## Docker Networking

Docker provides several network drivers to handle different networking scenarios.

### Network Types

#### 1. Bridge Network (Default)
The default network driver. Containers on the same bridge network can communicate with each other.

```bash
# Default bridge network (automatic)
docker run -d --name web1 nginx
docker run -d --name web2 nginx

# Custom bridge network (recommended)
docker network create --driver bridge my-bridge
docker run -d --network my-bridge --name app1 nginx
docker run -d --network my-bridge --name app2 nginx
```

#### 2. Host Network
Container shares the host's networking namespace. No network isolation.

```bash
# Container uses host's network directly
docker run -d --network host nginx
# Nginx will be accessible on host's port 80 directly
```

#### 3. None Network
Container has no network access - completely isolated.

```bash
# No networking
docker run -d --network none my-app
```

#### 4. Overlay Network
Used for multi-host networking in Docker Swarm. (Kubernetes uses its own networking plugins instead.)

```bash
# Create overlay network (requires swarm mode)
docker network create --driver overlay my-overlay
```

#### 5. Macvlan Network
Assigns a MAC address to container, making it appear as a physical device on the network.

```bash
# Create macvlan network
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 my-macvlan

# Run container with macvlan
docker run -d --network my-macvlan --ip=192.168.1.100 nginx
```

### Network Management

```bash
# Inspect network details
docker network inspect my-bridge

# Connect running container to network
docker network connect my-network container_name

# Disconnect container from network
docker network disconnect my-network container_name

# Remove network
docker network rm my-network
```

### Docker Compose Networking

```yaml
services:
  frontend:
    image: nginx
    networks:
      - frontend-net
      - backend-net
  
  backend:
    image: my-api
    networks:
      - backend-net
      - database-net
  
  database:
    image: postgres
    networks:
      - database-net

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
  database-net:
    driver: bridge
    internal: true  # No external access
```

## Docker Storage: Volumes, Bind Mounts, and tmpfs

Docker provides three ways to mount data into containers, each with different use cases.

### 1. Volumes (Recommended)
Managed by Docker, stored in Docker's area of the host filesystem. Best for production.

#### Named Volumes
```bash
# Create named volume
docker volume create my-data

# Use named volume
docker run -d -v my-data:/app/data nginx

# Multiple containers can share the same volume
docker run -d -v my-data:/var/log/nginx nginx:alpine
```

#### Anonymous Volumes
```bash
# Docker creates and manages anonymous volume
docker run -d -v /app/data nginx

# In Dockerfile
VOLUME ["/app/data"]
```

#### Volume Drivers
```bash
# The built-in local driver can also mount network storage, e.g. NFS
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \
  --opt device=:/path/to/dir \
  nfs-volume
```

### 2. Bind Mounts
Mount a host directory or file directly into the container. Useful for development.

```bash
# Mount host directory to container
docker run -d -v /host/path:/container/path nginx

# Mount current directory (development)
docker run -d -v "$(pwd)":/app node:24-alpine

# Read-only bind mount
docker run -d -v /host/config:/app/config:ro nginx

# Mount specific file
docker run -d -v /host/nginx.conf:/etc/nginx/nginx.conf:ro nginx
```

### 3. tmpfs Mounts
Store data in host's memory. Data disappears when container stops.

```bash
# Create tmpfs mount
docker run -d --tmpfs /tmp nginx

# With size limit
docker run -d --tmpfs /tmp:noexec,nosuid,size=100m nginx
```

### Volume vs Bind Mount vs tmpfs Comparison

| Feature | Volumes | Bind Mounts | tmpfs |
|---------|---------|-------------|-------|
| Host location | Docker managed | User specified | Memory |
| Persistence | Yes | Yes | No |
| Performance | Good | Good | Excellent |
| Backup friendly | Yes | Yes | No |
| Docker CLI management | Yes | No | No |
| Works on all platforms | Yes | Limited | Linux only |

### Docker Compose Storage Examples

```yaml
services:
  # Named volume example
  database:
    image: postgres:18-alpine
    volumes:
      - db_data:/var/lib/postgresql
    environment:
      POSTGRES_PASSWORD: secret

  # Bind mount example (development)
  web:
    image: nginx
    volumes:
      - ./html:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"

  # tmpfs example
  cache:
    image: redis:alpine
    tmpfs:
      - /data:noexec,nosuid,size=1g

  # Multiple mount types
  app:
    build: .
    volumes:
      # Bind mount for development
      - .:/app
      # Named volume for node_modules (prevents host override)
      - node_modules:/app/node_modules
      # tmpfs for temporary files
    tmpfs:
      - /app/tmp:size=50m

volumes:
  db_data:
    driver: local
  node_modules:
    driver: local
```

### Storage Best Practices

#### For Development
```bash
# Use bind mounts for code that changes frequently
docker run -d -v "$(pwd)":/app -v /app/node_modules node:24-alpine

# Exclude certain directories with anonymous volumes
# This prevents host files from overriding container files
```

#### For Production
```bash
# Use named volumes for data persistence
docker volume create app-data
docker run -d -v app-data:/data --name app my-app:1.0

# Backup volumes
docker run --rm -v app-data:/source -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz -C /source .

# Restore volumes
docker run --rm -v app-data:/target -v $(pwd):/backup \
  alpine tar xzf /backup/backup.tar.gz -C /target
```

#### Volume Drivers and External Storage
```yaml
# Using external storage systems
services:
  app:
    image: my-app
    volumes:
      - nfs-data:/data

volumes:
  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.example.com,rw
      device: ":/path/to/data"
```

## Best Practices

### Dockerfile Optimization
- Use specific base image tags (avoid `latest` in production)
- Minimize layers by combining RUN commands
- Use multi-stage builds for smaller production images
- Copy only necessary files

```dockerfile
# Multi-stage build: compile in a big image, ship a tiny one
# Stage 1: build (has the full Go toolchain, ~1 GB)
FROM golang:1.25 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./...

# Stage 2: run (just the binary, a few MB)
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app /app
USER nonroot
ENTRYPOINT ["/app"]
```

```dockerfile
# Same idea for a frontend: build with Node, serve the static files with nginx
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Security Considerations
- Don't run containers as root: add a `USER` instruction
- Use official or verified base images, and small ones (`-slim`, `-alpine`, distroless) to reduce what an attacker can use
- Rebuild regularly to pick up base image security patches
- Scan images for known vulnerabilities: `docker scout cves my-app:1.0` or `trivy image my-app:1.0`
- **Never bake secrets into images** (no `ENV PASSWORD=...` or `COPY .env`). Anyone who can pull the image can read every layer. Pass secrets at run time as environment variables or secret files, and use `RUN --mount=type=secret` for secrets needed during a build

### Resource Management
- Set memory and CPU limits
- Use health checks
- Implement proper logging
- Monitor container performance

```yaml
# Resource limits in docker-compose.yml
services:
  web:
    image: my-app
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]  # curl must exist in the image
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

**Restart policies:** `no` (default), `on-failure`, `unless-stopped`, `always`. Note that plain Docker and Compose only use health checks for *reporting* and for `depends_on`. They don't restart a container just because it's unhealthy. Orchestrators like Kubernetes do.

## Common Use Cases

1. **Development Environment Standardization**: Ensure all developers work with identical environments
2. **Microservices Architecture**: Deploy and manage individual services independently
3. **Continuous Integration/Deployment**: Build, test, and deploy applications consistently
4. **Application Modernization**: Containerize legacy applications for cloud migration
5. **Local Testing**: Test applications locally before deploying to production

## Quick Command Reference

| Task | Command |
|---|---|
| Build an image | `docker build -t name:tag .` |
| Run a container | `docker run -d --name c -p 8080:80 name:tag` |
| List containers / images | `docker ps -a` / `docker image ls` |
| Logs / shell | `docker logs -f c` / `docker exec -it c sh` |
| Stop / remove | `docker stop c` / `docker rm c` |
| Networks / volumes | `docker network ls` / `docker volume ls` |
| Push to a registry | `docker tag name:tag user/name:tag && docker push user/name:tag` |
| Compose up / down | `docker compose up -d` / `docker compose down` |
| Disk usage / cleanup | `docker system df` / `docker image prune` |

## Next Steps

Once you're comfortable with these basics, explore:
- Container orchestration with Kubernetes (next two weeks)
- Advanced networking configurations
- Docker security best practices (rootless mode, image signing)
- Monitoring and logging strategies

Docker's ecosystem is vast and powerful. Start with simple applications, experiment with different configurations, and gradually build your expertise through hands-on practice.