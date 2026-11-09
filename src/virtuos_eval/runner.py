"""Run items through a provider and write a scorecard."""

from __future__ import annotations

import csv
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

from .providers import Provider, parse_letter
from .scenarios import Item


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "run"


def run(
    items: list[Item],
    provider: Provider,
    *,
    out_dir: str | Path | None = None,
    model: str | None = None,
    corpus_version: str = "0.1-draft",
    design: str = "fit",
    label: str | None = None,
    verbose: bool = True,
) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if out_dir is None:
        out_dir = Path("runs") / f"{stamp}-{_slug(label or provider.name)}"
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    results = []
    with (out / "items.jsonl").open("w", encoding="utf-8") as fh:
        for item in items:
            fh.write(json.dumps(item.as_dict(), ensure_ascii=False) + "\n")

    for index, item in enumerate(items, 1):
        raw = provider.complete(item.prompt)
        answer = parse_letter(raw)
        ok = answer == item.correct
        results.append(
            {
                "item_id": item.item_id,
                "entry_id": item.entry_id,
                "virtue": item.virtue,
                "layer": item.layer,
                "tradition": item.tradition,
                "correct": item.correct,
                "answer": answer,
                "ok": ok,
                "raw": raw[:200],
            }
        )
        if verbose:
            mark = "ok " if ok else "MISS"
            print(f"[{index}/{len(items)}] {mark} {item.virtue}: expected {item.correct}, got {answer}")

    with (out / "results.jsonl").open("w", encoding="utf-8") as fh:
        for row in results:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    with (out / "scores.csv").open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(results[0].keys()) if results else ["item_id"])
        writer.writeheader()
        writer.writerows(results)

    n = len(results)
    k = sum(1 for r in results if r["ok"])
    low, high = wilson(k, n)

    def cutoff(rows: list[dict], key: str) -> list[tuple[str, int, int]]:
        buckets: dict[str, list[dict]] = {}
        for row in rows:
            buckets.setdefault(row[key], []).append(row)
        table = [(name, len(rows), sum(1 for r in rows if r["ok"])) for name, rows in buckets.items()]
        return sorted(table, key=lambda t: (-t[1], t[0]))

    lines = [
        f"# VirtuOS scorecard: {label or provider.name}",
        "",
        f"- Provider: `{provider.name}`" + (f" (`{model}`)" if model else ""),
        f"- Design: `{design}`",
        f"- Corpus: `{corpus_version}` (draft, entries AI-drafted, no human labels)",
        f"- Run: {stamp}",
        f"- Items: {n}",
        f"- Correct: {k} of {n} ({(k / n):.1%})",
        f"- Wilson 95% interval: {low:.1%} to {high:.1%}",
        f"- Chance for three options: 33.3%",
        "",
        "This measures agreement with one drafted answer under a forced choice. It is",
        "not a measure of wisdom, and the corpus has not been reviewed. Treat it as a",
        "smoke test for the pipeline until the label layer exists.",
        "",
        "## By virtue",
        "",
        "| Virtue | Items | Correct | Accuracy |",
        "|---|---:|---:|---:|",
    ]
    for name, total, good in cutoff(results, "virtue"):
        lines.append(f"| {name} | {total} | {good} | {good / total:.0%} |")

    lines += ["", "## By layer", "", "| Layer | Items | Correct | Accuracy |", "|---|---:|---:|---:|"]
    for name, total, good in cutoff(results, "layer"):
        lines.append(f"| {name} | {total} | {good} | {good / total:.0%} |")

    lines += ["", "## By tradition (top 10)", "", "| Tradition | Items | Correct | Accuracy |", "|---|---:|---:|---:|"]
    for name, total, good in cutoff(results, "tradition")[:10]:
        lines.append(f"| {name} | {total} | {good} | {good / total:.0%} |")

    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    meta = {
        "provider": provider.name,
        "model": model,
        "design": design,
        "corpus_version": corpus_version,
        "run": stamp,
        "items": n,
        "correct": k,
        "accuracy": k / n if n else 0.0,
        "wilson95": [low, high],
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    if verbose:
        print(f"\n{k}/{n} correct ({k / n:.1%}), 95% CI {low:.1%} to {high:.1%}" if n else "\nNo items.")
        print(f"Wrote {out}")
    return out
