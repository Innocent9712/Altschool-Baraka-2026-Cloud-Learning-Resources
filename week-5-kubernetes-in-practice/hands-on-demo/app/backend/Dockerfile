# Multi-stage build, as in Week 3: uv installs the dependencies in the builder
# stage, and only the finished virtual environment reaches the final image.

# ---------- Stage 1: builder
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ---------- Stage 2: runtime
FROM python:3.13-slim AS runtime

RUN groupadd --system appuser && useradd --system --gid appuser --no-create-home appuser

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY main.py ./

USER appuser

EXPOSE 8000

# No Docker HEALTHCHECK: Kubernetes ignores it. Health checking is done by the
# liveness and readiness probes in k8s/04-backend.yaml instead.

# One worker process per container. In Kubernetes you scale by adding Pods
# (replicas), not by adding worker processes inside one container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
