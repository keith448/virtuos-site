"""Turn corpus entries into forced-choice items.

Two designs:

- ``fit`` (default): the entry's wise response against two wise responses from
  other stories about the same virtue. All three options are wise in isolation;
  only one fits the situation. This removes the length cue: across the corpus the
  correct option is longest in about a third of items, the same as chance.
- ``temptation``: the entry's wise response against the entry's own tempting
  wrong answer and a wrong answer from another story. This tests the contrast the
  codebook cares about, but the drafted wise responses are about twice as long as
  the drafted wrong answers, so "pick the longest" scores about 79% on
  reciprocity. Treat it as a diagnostic, not a benchmark.

Scoring is exact match, so no judge model is needed. The corpus is a draft and
the entries are AI-drafted; a model can still score by preferring one register.
Report scores as pipeline tests until labels exist.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from .corpus import Corpus, Entry

LETTERS = ("A", "B", "C")


@dataclass(frozen=True)
class Item:
    item_id: str
    entry_id: str
    virtue: str
    layer: str
    tradition: str
    prompt: str
    options: tuple[str, str, str]
    correct: str

    def as_dict(self) -> dict:
        return {
            "item_id": self.item_id,
            "entry_id": self.entry_id,
            "virtue": self.virtue,
            "layer": self.layer,
            "tradition": self.tradition,
            "prompt": self.prompt,
            "options": list(self.options),
            "correct": self.correct,
        }


def _prompt(situation: str, options: tuple[str, str, str]) -> str:
    rows = "\n".join(f"{letter}. {text}" for letter, text in zip(LETTERS, options))
    return (
        "Someone is in the following situation. Which response is the wisest?\n\n"
        f"Situation: {situation}\n\n"
        f"{rows}\n\n"
        "Answer with one letter (A, B, or C) and nothing else."
    )


def _tested_virtue(entry: Entry, rng: random.Random) -> str | None:
    strong = sorted(name for name, strength in entry.virtues if strength >= 3 and name)
    if not strong:
        return None
    return strong[rng.randrange(len(strong))]


def build_items(
    corpus: Corpus,
    *,
    virtues: list[str] | None = None,
    layers: list[str] | None = None,
    n: int | None = None,
    seed: int = 0,
    min_strength: int = 3,
    design: str = "fit",
) -> list[Item]:
    if design not in {"fit", "temptation"}:
        raise ValueError("design must be 'fit' or 'temptation'")
    rng = random.Random(seed)
    pool = [
        e
        for e in corpus
        if e.situation
        and e.wise_response
        and (not layers or e.layer in layers)
        and any(s >= min_strength for _, s in e.virtues)
        and (design == "fit" or e.tempting_wrong_answer)
    ]
    pool.sort(key=lambda e: e.id)

    items: list[Item] = []
    for entry in pool:
        virtue = _tested_virtue(entry, rng)
        if virtue is None:
            continue
        if virtues and virtue not in virtues:
            continue

        counterparts = [
            other
            for other in corpus
            if other.id != entry.id
            and other.wise_response
            and other.strength(virtue) >= min_strength
            and (design == "fit" or other.tempting_wrong_answer)
        ]
        if not counterparts:
            continue

        different = [o for o in counterparts if o.tradition != entry.tradition]
        candidates = different or counterparts
        correct_text = entry.wise_response.strip()

        if design == "fit":
            picks = [candidates[rng.randrange(len(candidates))]]
            second_pool = [o for o in candidates if o.id != picks[0].id]
            if not second_pool:
                continue
            picks.append(second_pool[rng.randrange(len(second_pool))])
            texts = [correct_text, picks[0].wise_response.strip(), picks[1].wise_response.strip()]
        else:
            other = candidates[rng.randrange(len(candidates))]
            texts = [correct_text, entry.tempting_wrong_answer.strip(), other.tempting_wrong_answer.strip()]

        if len({t.casefold() for t in texts}) != 3:
            continue

        order = [0, 1, 2]
        rng.shuffle(order)
        options = tuple(texts[i] for i in order)
        correct = LETTERS[order.index(0)]

        items.append(
            Item(
                item_id=f"{entry.id}:{virtue}",
                entry_id=entry.id,
                virtue=virtue,
                layer=entry.layer,
                tradition=entry.tradition,
                prompt=_prompt(entry.situation.strip(), options),
                options=options,
                correct=correct,
            )
        )

    if n is not None and len(items) > n:
        rng.shuffle(items)
        items = items[:n]
        items.sort(key=lambda i: i.item_id)
    return items
