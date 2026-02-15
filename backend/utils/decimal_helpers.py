"""Shared Decimal conversion helpers.

Consolidated from multiple copies of `_dec` / `_to_d` scattered across the
codebase.  Import from here instead of re-defining per module.
"""
from decimal import Decimal
from typing import Any


def to_decimal(value: Any) -> Decimal:
    """Convert *value* to :class:`Decimal`, treating ``None`` as zero."""
    if value is None:
        return Decimal(0)
    return Decimal(str(value))
