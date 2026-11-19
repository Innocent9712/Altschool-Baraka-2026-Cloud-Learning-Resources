"""A small shop pricing API: send it a basket, get back the price breakdown."""

import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import pricing

APP_VERSION = os.getenv("APP_VERSION", "dev")

app = FastAPI(title="Shop Pricing API", version=APP_VERSION)


class Item(BaseModel):
    name: str
    price_cents: int = Field(gt=0)
    quantity: int = Field(ge=1)


class QuoteRequest(BaseModel):
    items: list[Item] = Field(min_length=1)
    discount_code: str | None = None


class Quote(BaseModel):
    subtotal: int
    discount: int
    shipping: int
    total: int


@app.get("/health")
def health():
    return {"status": "ok", "version": APP_VERSION}


@app.post("/quote", response_model=Quote)
def create_quote(request: QuoteRequest):
    items = [item.model_dump() for item in request.items]
    try:
        return pricing.quote(items, request.discount_code)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
