# ==============================================================================
# PRODUCTION-STYLE DOCKERFILE (multi-stage)
# ==============================================================================
# Improvements over Dockerfile.simple:
#   1. Multi-stage build: the tools used to INSTALL dependencies (uv and its
#      download cache) stay in the builder stage and never reach the final image.
#   2. Runs as a non-root user.
#   3. A HEALTHCHECK so Docker can report whether the app is actually working.
# ==============================================================================

# ---------- Stage 1: builder — install dependencies into a virtual environment
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv

# Compile .pyc files at build time (faster startup); copy files instead of
# hard-linking them, so the .venv can be copied to another stage cleanly.
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ---------- Stage 2: runtime — only what's needed to RUN the app
FROM python:3.13-slim AS runtime

# Create an unprivileged system user to run the app
RUN groupadd --system appuser && useradd --system --gid appuser --no-create-home appuser

WORKDIR /app

# Copy just the finished virtual environment from the builder stage
COPY --from=builder /app/.venv /app/.venv

# PYTHONUNBUFFERED: print logs immediately so `docker logs` shows them
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# Code stays owned by root, so the app user can run it but can't modify it
COPY main.py ./

USER appuser

EXPOSE 8000

# Uses Python (already in the image) rather than installing curl just for this
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
