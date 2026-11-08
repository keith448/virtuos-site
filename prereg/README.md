# Pre-registration

Written before collection, not after. The point is to fix the stopping rule in
advance, so "we stopped at five lineages" cannot be an artifact of when we stopped
looking.

One file per virtue: `prereg/<virtue>.json`.

## Rules

1. Write the file **before** importing any entry for that virtue.
2. Name the target lineages and the corpus to be searched in each.
3. Set a target number of entries per lineage. Collecting stops at that number or
   when the corpus is exhausted, whichever comes first. Both outcomes are reported.
4. A lineage added after collection begins goes in `post_hoc` with a date and a
   reason, and is reported separately from the pre-registered set.
5. The virtue instance still has to pass codebook V1–V3. Pre-registration fixes
   *where* to look, not *what counts*.

## Why this exists

Opportunistic collection plus a five-lineage threshold is a machine for finding
five lineages. You search until the number appears, then report convergence. The
number is then a fact about the search, not about the traditions.

Pre-registration is the cheapest available defence. It does not make the result
true; it makes the search auditable.
