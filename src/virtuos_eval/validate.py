"""Checks on item design that need no human labels.

The question these answer: can a model score well without engaging the situation?
If the correct option is always the longest, or it copies the situation's words,
the benchmark measures style. That is testable now, before any review.

These are warnings, not gates. A flag means look closely; it does not mean the
item is broken.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .scenarios import Item

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had",
    "has", "have", "he", "her", "his", "i", "if", "in", "is", "it", "its", "me",
    "my", "not", "of", "on", "or", "our", "she", "so", "that", "the", "their",
    "them", "then", "there", "they", "this", "to", "was", "we", "were", "what",
    "when", "which", "who", "will", "with", "you", "your",
}


def tokens(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z']+", text.lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


@dataclass
class Validation:
    n: int
    letters: dict[str, int]
    correct_longest: float
    mean_len_correct: float
    mean_len_distractor: float
    overlap_correct: float
    overlap_distractor: float
    flags: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "items": self.n,
            "letters": self.letters,
            "correct_longest": self.correct_longest,
            "mean_len_correct": self.mean_len_correct,
            "mean_len_distractor": self.mean_len_distractor,
            "overlap_correct": self.overlap_correct,
            "overlap_distractor": self.overlap_distractor,
            "flags": self.flags,
        }


def validate(items: list[Item]) -> Validation:
    n = len(items)
    letters = {"A": 0, "B": 0, "C": 0}
    longest = 0
    len_correct = 0
    len_distractor = 0
    overlap_correct = 0.0
    overlap_distractor = 0.0

    for item in items:
        letters[item.correct] += 1
        lengths = [len(o) for o in item.options]
        correct_len = len(item.options["ABC".index(item.correct)])
        if correct_len == max(lengths):
            longest += 1
        len_correct += correct_len
        len_distractor += sum(lengths) - correct_len

        situation = tokens(item.prompt.split("Situation:", 1)[-1].split("\n")[0])
        correct_text = item.options["ABC".index(item.correct)]
        overlap_correct += len(tokens(correct_text) & situation) / max(1, len(tokens(correct_text)))
        for index, option in enumerate(item.options):
            if index == "ABC".index(item.correct):
                continue
            overlap_distractor += len(tokens(option) & situation) / max(1, len(tokens(option)))

    mean_len_correct = len_correct / n if n else 0
    mean_len_distractor = (len_distractor / (2 * n)) if n else 0
    correctness_longest = longest / n if n else 0
    mean_overlap_correct = overlap_correct / n if n else 0
    mean_overlap_distractor = (overlap_distractor / (2 * n)) if n else 0

    flags = []
    if n and max(letters.values()) / n > 0.45:
        flags.append("position imbalance: one letter holds more than 45% of the answers")
    if correctness_longest > 0.5:
        flags.append("length cue: the correct option is the longest in more than half the items")
    if mean_len_distractor and not (0.85 <= mean_len_correct / mean_len_distractor <= 1.15):
        flags.append(
            f"length cue: correct options average {mean_len_correct / mean_len_distractor:.2f}x the distractors"
        )
    if mean_overlap_correct - mean_overlap_distractor > 0.15:
        flags.append("situation-copy cue: the correct option reuses the situation's words more than the distractors")
    if n < 30:
        flags.append(f"small sample: {n} items; intervals will be wide")

    return Validation(
        n=n,
        letters=letters,
        correct_longest=correctness_longest,
        mean_len_correct=mean_len_correct,
        mean_len_distractor=mean_len_distractor,
        overlap_correct=mean_overlap_correct,
        overlap_distractor=mean_overlap_distractor,
        flags=flags,
    )


def report(result: Validation) -> str:
    lines = [
        "# Item validation",
        "",
        f"- Items: {result.n}",
        f"- Answer letters: A {result.letters['A']}, B {result.letters['B']}, C {result.letters['C']}",
        f"- Correct option is longest: {result.correct_longest:.0%}",
        f"- Mean length: correct {result.mean_len_correct:.0f}, distractors {result.mean_len_distractor:.0f}",
        f"- Situation-word overlap: correct {result.overlap_correct:.2f}, distractors {result.overlap_distractor:.2f}",
        "",
        "## Flags",
        "",
    ]
    lines += [f"- {flag}" for flag in result.flags] or ["- none"]
    lines += [
        "",
        "A clean sheet does not prove the items are good. It only rules out three",
        "cheap ways to score: answer position, answer length, and copying the situation.",
        "The remaining test needs a model: run the same items with the situation removed.",
        "If accuracy stays high, the options alone carry the answer.",
    ]
    return "\n".join(lines) + "\n"
