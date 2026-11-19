"""Pricing rules for the shop: subtotals, discount codes and shipping.

All amounts are in cents (integers), so there are no floating-point rounding surprises.
"""

# Discount codes and the percentage they take off the subtotal
DISCOUNT_CODES = {
    "WELCOME10": 10,
    "SAVE20": 20,
}

# Orders worth at least this much (after discounts) ship for free
FREE_SHIPPING_THRESHOLD = 5000
SHIPPING_FEE = 500


def subtotal(items: list[dict]) -> int:
    """Sum of price x quantity for every item."""
    for item in items:
        if item["quantity"] < 1:
            raise ValueError(f"Quantity for {item['name']} must be at least 1")
    return sum(item["price_cents"] * item["quantity"] for item in items)


def discount(amount: int, code: str | None) -> int:
    """How much a discount code takes off. No code means no discount."""
    if code is None:
        return 0
    if code not in DISCOUNT_CODES:
        raise ValueError(f"Unknown discount code: {code}")
    return amount * DISCOUNT_CODES[code] // 100


def shipping(amount: int) -> int:
    """Shipping is free from the threshold upwards."""
    if amount >= FREE_SHIPPING_THRESHOLD:
        return 0
    return SHIPPING_FEE


def quote(items: list[dict], code: str | None = None) -> dict:
    """The full price breakdown for an order."""
    items_total = subtotal(items)
    money_off = discount(items_total, code)
    after_discount = items_total - money_off
    delivery = shipping(after_discount)
    return {
        "subtotal": items_total,
        "discount": money_off,
        "shipping": delivery,
        "total": after_discount + delivery,
    }
