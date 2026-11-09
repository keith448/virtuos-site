"""Load the VirtuOS corpus and query it by virtue, tradition, layer or language."""

from __future__ import annotations

import json
from dataclasses import dataclass
from importlib import resources
from pathlib import Path


@dataclass(frozen=True)
class Entry:
    id: str
    story_title: str | None
    layer: str
    tradition: str
    language: str | None
    situation: str
    wise_response: str
    why_it_worked: str
    tempting_wrong_answer: str
    virtues: tuple[tuple[str, int], ...]
    source: dict
    provenance: dict
    parallels: tuple[dict, ...]
    raw: dict

    @classmethod
    def from_row(cls, row: dict) -> "Entry":
        return cls(
            id=row["id"],
            story_title=row.get("story_title"),
            layer=row.get("layer") or "unknown",
            tradition=row.get("tradition") or "unknown",
            language=row.get("language"),
            situation=row.get("situation") or "",
            wise_response=row.get("wise_response") or "",
            why_it_worked=row.get("why_it_worked") or "",
            tempting_wrong_answer=row.get("tempting_wrong_answer") or "",
            virtues=tuple(
                (v.get("name") or "", int(v.get("strength") or 0))
                for v in row.get("virtues") or []
            ),
            source=row.get("source") or {},
            provenance=row.get("provenance") or {},
            parallels=tuple(row.get("parallels") or ()),
            raw=row,
        )

    def strength(self, virtue: str) -> int:
        for name, value in self.virtues:
            if name == virtue:
                return value
        return 0

    def has_original(self) -> bool:
        return bool((self.raw.get("translation") or {}).get("original_text"))


class Corpus:
    """An immutable collection of entries."""

    def __init__(self, entries: list[Entry], version: str = "0.1-draft"):
        self._entries = tuple(entries)
        self.version = version

    @classmethod
    def load(cls, path: str | Path | None = None) -> "Corpus":
        if path is None:
            ref = resources.files("virtuos_eval").joinpath("data/v0.1-draft.jsonl")
            text = ref.read_text(encoding="utf-8")
        else:
            text = Path(path).read_text(encoding="utf-8")
        rows = [json.loads(line) for line in text.splitlines() if line.strip()]
        return cls([Entry.from_row(row) for row in rows])

    def __len__(self) -> int:
        return len(self._entries)

    def __iter__(self):
        return iter(self._entries)

    def entries(
        self,
        *,
        virtue: str | None = None,
        tradition: str | None = None,
        layer: str | None = None,
        language: str | None = None,
        min_strength: int | None = None,
        with_original: bool | None = None,
    ) -> list[Entry]:
        out = []
        for entry in self._entries:
            if virtue is not None and entry.strength(virtue) < (min_strength or 1):
                continue
            if tradition is not None and entry.tradition != tradition:
                continue
            if layer is not None and entry.layer != layer:
                continue
            if language is not None and entry.language != language:
                continue
            if with_original is not None and entry.has_original() != with_original:
                continue
            out.append(entry)
        return out

    def virtues(self, *, min_strength: int = 3) -> dict[str, int]:
        counts: dict[str, int] = {}
        for entry in self._entries:
            for name, strength in entry.virtues:
                if strength >= min_strength:
                    counts[name] = counts.get(name, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def traditions(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for entry in self._entries:
            counts[entry.tradition] = counts.get(entry.tradition, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def stats(self) -> dict:
        by_layer: dict[str, int] = {}
        with_original = 0
        for entry in self._entries:
            by_layer[entry.layer] = by_layer.get(entry.layer, 0) + 1
            with_original += int(entry.has_original())
        return {
            "version": self.version,
            "entries": len(self),
            "with_original": with_original,
            "by_layer": dict(sorted(by_layer.items(), key=lambda kv: -kv[1])),
            "by_virtue": self.virtues(),
            "traditions": len(self.traditions()),
        }
