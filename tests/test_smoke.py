from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from virtuos_eval import Corpus, build_items, parse_letter, run, validate, wilson
from virtuos_eval.providers import Provider
from virtuos_eval.validate import report as validation_report


class FixedProvider(Provider):
    name = "fixed"

    def __init__(self, letter: str):
        self.letter = letter

    def complete(self, prompt: str) -> str:
        return self.letter


class CorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = Corpus.load()

    def test_loads_release(self):
        self.assertGreater(len(self.corpus), 1400)
        self.assertEqual(len(self.corpus.virtues()), 20)

    def test_filters(self):
        rows = self.corpus.entries(virtue="reciprocity", min_strength=3)
        self.assertGreater(len(rows), 0)
        self.assertTrue(all(e.strength("reciprocity") >= 3 for e in rows))

    def test_stats(self):
        stats = self.corpus.stats()
        self.assertEqual(stats["entries"], len(self.corpus))
        self.assertGreater(stats["with_original"], 1000)


class ScenarioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = Corpus.load()

    def test_items_are_deterministic(self):
        first = build_items(self.corpus, n=12, seed=7)
        second = build_items(self.corpus, n=12, seed=7)
        self.assertEqual([i.item_id for i in first], [i.item_id for i in second])
        self.assertEqual([i.prompt for i in first], [i.prompt for i in second])

    def test_options_and_answer(self):
        for item in build_items(self.corpus, n=25, seed=3):
            self.assertEqual(len(set(item.options)), 3)
            self.assertIn(item.correct, {"A", "B", "C"})
            self.assertIn("Situation:", item.prompt)
            for option in item.options:
                self.assertIn(option, item.prompt)


class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = Corpus.load()

    def test_parse_letter(self):
        self.assertEqual(parse_letter("B"), "B")
        self.assertEqual(parse_letter("b."), "B")
        self.assertEqual(parse_letter("The answer is C"), "C")
        self.assertEqual(parse_letter("(A)"), "A")
        self.assertIsNone(parse_letter(""))

    def test_scoring_and_files(self):
        items = build_items(self.corpus, n=8, seed=1)
        with tempfile.TemporaryDirectory() as tmp:
            out = run(items, FixedProvider("A"), out_dir=tmp, verbose=False)
            meta = json.loads((Path(out) / "meta.json").read_text())
            expected = sum(1 for i in items if i.correct == "A")
            self.assertEqual(meta["items"], len(items))
            self.assertEqual(meta["correct"], expected)
            for name in ("items.jsonl", "results.jsonl", "scores.csv", "report.md"):
                self.assertTrue((Path(out) / name).exists())

    def test_wilson(self):
        low, high = wilson(50, 100)
        self.assertLess(low, 0.5)
        self.assertGreater(high, 0.5)


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = Corpus.load()

    def test_validation_counts(self):
        items = build_items(self.corpus, virtues=["reciprocity"], n=0, seed=0)
        result = validate(items)
        self.assertEqual(result.n, len(items))
        self.assertEqual(sum(result.letters.values()), len(items))

    def test_report_mentions_flags(self):
        items = build_items(self.corpus, n=12, seed=4)
        text = validation_report(validate(items))
        self.assertIn("# Item validation", text)
        self.assertIn("Flags", text)


if __name__ == "__main__":
    unittest.main()
