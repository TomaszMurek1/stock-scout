"""Shared Decimal conversion helpers.

Consolidated from multiple copies of `_dec` / `_to_d` scattered across the
codebase.  Import from here instead of re-defining per module.
"""
from decimal import Decimal, InvalidOperation
from typing import Any


def to_decimal(value: Any) -> Decimal:
    """Convert *value* to :class:`Decimal`, treating ``None`` as zero.

    * Passes through existing ``Decimal`` instances unchanged.
    * Returns ``Decimal("0")`` for ``None`` or un-parseable values.
    """
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")
