# Multi-stage build, the same pattern as Week 3:
# install dependencies in a builder stage, copy only the finished .venv into the final image.

# ---------- Stage 1: builder — install the app's dependencies (not the dev tools)
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

# ---------- Stage 2: runtime — only what's needed to run the app
FROM python:3.13-slim AS runtime

RUN groupadd --system appuser && useradd --system --gid appuser --no-create-home appuser

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY main.py pricing.py ./

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
