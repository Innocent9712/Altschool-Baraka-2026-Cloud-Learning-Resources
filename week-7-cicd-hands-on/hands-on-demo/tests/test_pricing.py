"""Unit tests: the pricing rules on their own, no web server involved."""

import pytest

import pricing

BOOK = {"name": "Book", "price_cents": 1500, "quantity": 2}
PEN = {"name": "Pen", "price_cents": 250, "quantity": 4}


def test_subtotal_adds_price_times_quantity():
    assert pricing.subtotal([BOOK, PEN]) == 3000 + 1000


def test_subtotal_rejects_zero_quantity():
    with pytest.raises(ValueError):
        pricing.subtotal([{"name": "Book", "price_cents": 1500, "quantity": 0}])


def test_no_code_means_no_discount():
    assert pricing.discount(4000, None) == 0


def test_known_code_takes_its_percentage_off():
    assert pricing.discount(4000, "WELCOME10") == 400
    assert pricing.discount(4000, "SAVE20") == 800


def test_unknown_code_is_rejected():
    with pytest.raises(ValueError):
        pricing.discount(4000, "FREESTUFF")


def test_shipping_is_charged_below_the_threshold():
    assert pricing.shipping(4999) == pricing.SHIPPING_FEE


def test_shipping_is_free_at_exactly_the_threshold():
    assert pricing.shipping(5000) == 0


def test_shipping_is_free_above_the_threshold():
    assert pricing.shipping(12000) == 0


def test_quote_puts_it_all_together():
    # 4000 subtotal, 10% off = 3600, below the threshold so shipping is added
    assert pricing.quote([BOOK, PEN], "WELCOME10") == {
        "subtotal": 4000,
        "discount": 400,
        "shipping": 500,
        "total": 4100,
    }
