"""Command line: virtuos stats | list | validate | test | export."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from importlib import resources

from . import __version__
from .corpus import Corpus
from .providers import get_provider
from .runner import run
from .scenarios import build_items
from .validate import report as validation_report
from .validate import validate as validate_items


def _split(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    out = []
    for value in values:
        out.extend(part.strip() for part in value.split(",") if part.strip())
    return out or None


def _corpus(args) -> Corpus:
    return Corpus.load(getattr(args, "file", None))


def cmd_stats(args) -> int:
    corpus = _corpus(args)
    stats = corpus.stats()
    print(f"corpus {stats['version']}: {stats['entries']} entries, {stats['with_original']} with original text")
    print(f"{stats['traditions']} traditions")
    print("\nby layer")
    for name, count in stats["by_layer"].items():
        print(f"  {count:5d}  {name}")
    print("\nby virtue (strength 3)")
    for name, count in stats["by_virtue"].items():
        flag = "  thin" if count < 30 else ""
        print(f"  {count:5d}  {name}{flag}")
    return 0


def cmd_list(args) -> int:
    corpus = _corpus(args)
    rows = corpus.entries(
        virtue=args.virtue,
        tradition=args.tradition,
        layer=args.layer,
        language=args.language,
        min_strength=args.min_strength,
        with_original=args.with_original,
    )
    for entry in rows[: args.limit]:
        strong = ", ".join(name for name, s in entry.virtues if s >= 3)
        title = entry.story_title or entry.situation[:40]
        print(f"{entry.id[:8]}  {entry.layer:<11}  {entry.tradition:<24}  {title[:44]:<44}  {strong}")
    print(f"\n{len(rows)} entries" + (f", showing {min(len(rows), args.limit)}" if len(rows) > args.limit else ""))
    return 0


def cmd_test(args) -> int:
    corpus = _corpus(args)
    virtues = _split(args.virtue)
    layers = _split(args.layer)
    items = build_items(
        corpus,
        virtues=virtues,
        layers=layers,
        n=None if args.n == 0 else args.n,
        seed=args.seed,
        design=args.design,
    )
    if not items:
        print("No items matched those filters.", file=sys.stderr)
        return 1
    provider = get_provider(
        args.provider,
        model=args.model,
        api_key=args.api_key,
        base_url=args.base_url,
        host=args.host,
        seed=args.seed,
        letter=args.letter,
    )
    out = run(
        items,
        provider,
        out_dir=args.out,
        model=args.model,
        corpus_version=corpus.version,
        design=args.design,
        label=args.label,
        verbose=not args.quiet,
    )
    print(out)
    return 0


def cmd_export(args) -> int:
    source = resources.files("virtuos_eval").joinpath("data/v0.1-draft.jsonl")
    with resources.as_file(source) as path:
        shutil.copyfile(path, args.out)
    print(f"Wrote {args.out}")
    return 0


def cmd_validate(args) -> int:
    corpus = _corpus(args)
    items = build_items(
        corpus,
        virtues=_split(args.virtue),
        layers=_split(args.layer),
        n=None if args.n == 0 else args.n,
        seed=args.seed,
        design=args.design,
    )
    if not items:
        print("No items matched those filters.", file=sys.stderr)
        return 1
    text = validation_report(validate_items(items))
    print(text)
    if args.out:
        from pathlib import Path

        Path(args.out).write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="virtuos", description="VirtuOS corpus tools and benchmark runner")
    parser.add_argument("--version", action="version", version=f"virtuos-eval {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    for name, func, help_text in [
        ("stats", cmd_stats, "counts by layer, virtue and tradition"),
        ("list", cmd_list, "list entries"),
        ("validate", cmd_validate, "check items for position, length and copy cues"),
        ("test", cmd_test, "run the forced-choice benchmark against a model"),
        ("export", cmd_export, "write the bundled corpus to a file"),
    ]:
        p = sub.add_parser(name, help=help_text)
        p.set_defaults(func=func)
        if name in {"stats", "list", "validate", "test"}:
            p.add_argument("--file", help="read a corpus JSONL instead of the bundled one")

    p = sub.choices["list"]
    p.add_argument("--virtue")
    p.add_argument("--tradition")
    p.add_argument("--layer")
    p.add_argument("--language")
    p.add_argument("--min-strength", type=int, default=3)
    p.add_argument("--with-original", action="store_true", default=None)
    p.add_argument("--limit", type=int, default=20)

    p = sub.choices["validate"]
    p.add_argument("--virtue", action="append", help="repeat or comma-separate; default all")
    p.add_argument("--layer", action="append", help="repeat or comma-separate; default all")
    p.add_argument("--design", default="fit", choices=["fit", "temptation"])
    p.add_argument("--n", type=int, default=0, help="number of items, 0 for all")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--out", help="write the report to a markdown file")

    p = sub.choices["test"]
    p.add_argument("--provider", default="echo", choices=["echo", "random", "longest", "shortest", "openai", "anthropic", "ollama"])
    p.add_argument("--model")
    p.add_argument("--api-key")
    p.add_argument("--base-url")
    p.add_argument("--host")
    p.add_argument("--letter", default="A", help="answer for the echo provider")
    p.add_argument("--virtue", action="append", help="repeat or comma-separate; default all")
    p.add_argument("--layer", action="append", help="repeat or comma-separate; default all")
    p.add_argument("--design", default="fit", choices=["fit", "temptation"])
    p.add_argument("--n", type=int, default=30, help="number of items, 0 for all")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--out", help="output directory")
    p.add_argument("--label", help="name for the run and report")
    p.add_argument("--quiet", action="store_true")

    p = sub.choices["export"]
    p.add_argument("--out", default="virtuos-v0.1-draft.jsonl")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (RuntimeError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
