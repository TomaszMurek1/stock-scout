"""Reusable iteration helpers."""
from typing import TypeVar, Iterator, Sequence

T = TypeVar("T")


def chunked(seq: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    """Yield successive *size*-chunks from *seq*."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]
