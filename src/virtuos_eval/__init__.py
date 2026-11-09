"""VirtuOS: the draft corpus and a forced-choice benchmark runner."""

from __future__ import annotations

from .corpus import Corpus, Entry
from .providers import get_provider, parse_letter
from .runner import run, wilson
from .scenarios import Item, build_items
from .validate import Validation, validate

__version__ = "0.1.0"
__all__ = [
    "Corpus",
    "Entry",
    "Item",
    "Validation",
    "build_items",
    "get_provider",
    "parse_letter",
    "run",
    "validate",
    "wilson",
    "__version__",
]
