# Dose Consistency Intelligence

## Research question

How accurately and repeatably does timed grinder operation produce the intended basket dose?

## Scope

- Timed grinder output consistency
- Initial Output versus target dose
- Actual Basket Dose variance
- Correction frequency and magnitude
- Effects of grind time, setting, Hopper state, and Bag lifecycle

## Boundary

DCI measures dosing consistency. It does not decide whether weighing can be skipped; that belongs to OSI.

## Status

**Evidence-ready, not implementation-ready.** Phase 1.5 external verification remains pending, and approved formulas/confidence thresholds are not yet recorded.

## Governing evidence

- [Intelligence Engine Map](../../intelligence-engine-map.md)
- [CSV Data Dictionary](../../csv-data-dictionary.md)
- [HMI research](../HMI/README.md)
- [OSI research](../OSI/README.md)
- [Initial Grinder Output verification — 2026-08-29](initial-grinder-output-verification-2026-08-29.md) — owner-confirmed System Phase 2 (Bags 3–5): 35/97, or 36.1%, within ±0.3 g of 18.0 g. Descriptive baseline only: Phase 2 held grind time relatively fixed and did not optimize natural 18.0 g hits.
- [Phase 2 vs Phase 3 current-app comparison — 2026-08-29](phase-2-vs-phase-3-app-comparison-2026-08-29.md) — live app data scoped by owner-confirmed Bag membership: ±0.3 g hit rate improved from 43.7% (55/126) to 55.1% (27/49), with lower mean absolute error and variability; correction/waste measures remain mixed.
