# Week 3: Container Technology & Docker Hands-on

This week introduces container technology and how it simplifies application deployment. You'll learn what
containers are, how they differ from virtual machines, and explore Docker, the most popular container platform,
through hands-on exercises.

**By the end of the week** you'll understand the fundamentals of containers and be able to use Docker to create,
run, and manage containerized applications.

## Learning Objectives

By the end of this week, you should be able to:

1. Explain what a container is, and how containers differ from virtual machines
2. Describe the Linux features that make containers possible: **namespaces**, **cgroups**, and layered filesystems
3. Explain the difference between an **image** and a **container**, and how images are named, tagged, and stored in **registries**
4. Write a **Dockerfile**, build an image from it, and explain layer caching
5. Run, inspect, debug, and remove containers (`run`, `ps`, `logs`, `exec`, `stop`, `rm`)
6. Connect containers with **networks** and persist data with **volumes**
7. Improve an image with a **multi-stage build**, a **non-root user**, and a **health check**
8. Define and run a multi-container application with **Docker Compose**

## Materials

| File | What it is |
|---|---|
| [containerization_guide.md](./containerization_guide.md) | Concepts: containers vs VMs, namespaces, cgroups, OCI, how Docker works, runtimes |
| [docker_guide.md](./docker_guide.md) | Practical reference: images, containers, Dockerfiles, Compose, registries, networking, storage, best practices |
| [hands-on-demo/](./hands-on-demo/) | The live class demo: containerizing a FastAPI + PostgreSQL app, from `docker run` to Docker Compose |
| [exercise/](./exercise/) | Take-home exercise: write Dockerfiles for a Python, a Node.js, and a Go app |

## Class Outline

1. **The problem**: "it works on my machine".
2. **Concepts**: containers vs VMs, then namespaces and cgroups, then images, layers, and OCI, then how `docker run` works (`dockerd → containerd → runc`).
3. **Live demo**: follow [hands-on-demo/README.md](./hands-on-demo/README.md)
   - Step 1: containers are just isolated processes (namespaces and cgroups in action)
   - Step 2: images and containers
   - Step 3: writing a Dockerfile and building an image
   - Step 4: running it, and why it fails on its own
   - Step 5: networks
   - Step 6: volumes
   - Step 7: a better Dockerfile
   - Step 8: Docker Compose
   - Step 9: sharing images through a registry
4. **Best practices**: pinned base images, layer order, `.dockerignore`, non-root users, no secrets in images.
5. **Introduce the exercise.**

## After Class

1. Read [containerization_guide.md](./containerization_guide.md) and answer its *Check Your Understanding* questions
2. Repeat the hands-on demo on your own machine
3. Use [docker_guide.md](./docker_guide.md) as your reference, and complete the [exercise](./exercise/README.md)
