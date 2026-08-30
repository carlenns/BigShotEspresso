# Initial Grinder Output Verification — uploaded CSV snapshot

> **Analysis timestamp:** 2026-08-29  
> **Status:** Reproducible descriptive verification; not a pre-registered experiment  
> **Metric confirmed by owner:** `Initial Output (g)` / Initial Grinder Output, before top-up or trimming  
> **Target:** 18.0 g  
> **Tolerance tested:** inclusive ±0.3 g, equivalent to 17.7–18.3 g
> **Owner-confirmed System Phase 2 scope:** Bags 3, 4 and 5 only

> **Current-data note:** This document verifies an older uploaded CSV snapshot. It is superseded for current Phase-to-Phase metrics by the [current app comparison](phase-2-vs-phase-3-app-comparison-2026-08-29.md), while remaining valid evidence of what the CSV contained.

## Question

Does the uploaded shot CSV support the owner's recollection that Initial Grinder Output landed within ±0.3 g more than 60% of the time?

## Operating-objective clarification

The owner clarified on 2026-08-29 that System Phase 2 was **not** an optimization phase intended to hit a natural 18.0 g Initial Grinder Output repeatedly.

During System Phase 2:

- grind time was set near the beginning of each Bag and generally left unchanged;
- the owner was establishing a scientific process and observing natural timed-output behaviour;
- the owner sometimes deliberately over-ground and removed excess coffee;
- this was preferred in some situations because the grinder's minimum additional timed grind is approximately 0.2 seconds and was reported to produce roughly 0.5–0.7 g, making a 0.1–0.2 g under-dose inefficient to correct and increasing waste.

Therefore, the 36.1% statistic below is a descriptive retrospective comparison with 18.0 g. It is **not a valid success rate for the Phase 2 operating objective** and must not be used to claim that Phase 2 performed poorly.

System Phase 3 consists of owner-confirmed Bags 6 and 7 and has a different objective: actively optimize grind time to improve the probability that natural Initial Grinder Output lands at 18.0 g before correction. The owner confirmed that Bag 7 is present in the current app. The owner's statement that all relevant metrics have improved in Phase 3 is not testable from this uploaded CSV because it contains only Bags 2–5 and no Bags 6 or 7; Phase 3 verification must use the current app/database records or a newer export.

## Source evidence

- Authoritative workspace export: `CSV Files/Shots-Shots Entering-7.csv`
- SHA-256: `34eb247193beba4370a00236c2355bf14ff8c576191a9eb040391424eb5f7a94`
- Repository fixture: `artifacts/api-server/test-fixtures/csv/Shots-Shots Entering-7.csv`
- The fixture has the same SHA-256 and is byte-identical to the workspace export.
- Export rows: 164
- Rows with nonblank Initial Grinder Output: 125
- Measured-shot date range: 2026-04-27 11:30am through 2026-06-24 3:30am, as stored in the CSV

The older attached asset `attached_assets/Shots-Shots_Entering-3_1780995685326.csv` contains 132 rows and only Bags 2–4. It was not used for the primary result because the named `Entering-7` export is newer and more complete.

## Calculation

For every System Phase 2 row (Bag 3, 4 or 5) with a numeric `Initial Output (g)`:

```text
within tolerance = absolute value of (Initial Output - 18.0) <= 0.3
percentage = within-tolerance rows / rows with Initial Output
```

No missing Initial Output was treated as a success or failure. No result was inferred from corrected `Dose (g)`, `Total Output (g)`, top-up, or trim fields.

## Verified result

| Population | Within ±0.3 g | Measured outputs | Percentage |
|---|---:|---:|---:|
| System Phase 2 — Bags 3, 4 and 5 | 35 | 97 | **36.1%** |
| System Phase 2 with `Include in Analysis = 1` | 34 | 91 | **37.4%** |

The uploaded CSV therefore **does not support** the recalled descriptive claim of more than 60% within ±0.3 g. This does not constitute a Phase 2 performance failure because 18.0 g natural-hit optimization was not the Phase 2 objective.

For context only, including Bag 2 produces 54 of 125, or 43.2%. Bag 2 is excluded from the primary result because the owner identified it as outside System Phase 2.

## Descriptive distribution

Across the 97 measured System Phase 2 outputs:

- mean: 17.582 g;
- median: 17.6 g;
- sample standard deviation: 0.696 g;
- minimum: 16.0 g;
- maximum: 19.4 g.

Sensitivity to tolerance around the 18.0 g target:

| Inclusive tolerance | Successful outputs | Percentage |
|---|---:|---:|
| ±0.1 g | 12 / 97 | 12.4% |
| ±0.2 g | 22 / 97 | 22.7% |
| ±0.3 g | 35 / 97 | 36.1% |
| ±0.4 g | 46 / 97 | 47.4% |
| ±0.5 g | 52 / 97 | 53.6% |
| ±0.6 g | 55 / 97 | 56.7% |

None of the tested System Phase 2 tolerances through ±0.6 g exceeds 60%. The earlier whole-export result at ±0.6 g was driven partly by Bag 2 and is not the Phase 2 statistic.

## Results by Bag

| Bag | Measured outputs | Within ±0.3 g | Percentage | Mean | Sample SD |
|---|---:|---:|---:|---:|---:|
| Bag 2 — De Luca's — Brazil | 28 | 19 | 67.9% | 18.071 g | 0.386 g |
| Bag 3 — De Luca's — Guatemala • Washed | 41 | 5 | 12.2% | 17.054 g | 0.575 g |
| Bag 4 — De Luca's — Costa Rica | 49 | 28 | 57.1% | 17.933 g | 0.428 g |
| Bag 5 — De Luca's — Peru • Fairtrade, Organic | 7 | 2 | 28.6% | 18.229 g | 0.826 g |

Bag 2 is displayed only as an excluded comparison. The large Bag-to-Bag difference shows why an overall percentage should not be treated as a universal grinder property without controlling system phase, grind time, grinder setting, Hopper state, Bag lifecycle, and adjustment history.

## Hopper-baseline comparison

`Baseline Unaided Output (g)` is the expected output for the assigned Hopper range, not the fixed 18.0 g basket target. Comparing Initial Grinder Output with its row-level Hopper baseline gives:

- 36 of 97 System Phase 2 outputs within ±0.3 g;
- **37.1%**.

The System Phase 2 `Include in Analysis = 1` subset gives 35 of 91, or **38.5%**. This alternative definition also does not exceed 60%.

## Bag and roaster coverage

The uploaded Bag export contains five Bags, all from De Luca's. The shot export contains rows for four of those Bags (Bags 2–5); Bag 1 has no rows in this shot snapshot. Owner-confirmed System Phase 3 Bags 6 and 7 are absent from both uploaded exports. Bag 7 is present in the current app according to the owner, confirming that the uploaded CSV is an older snapshot rather than a complete representation of current app data.

Therefore, the uploaded CSVs do not verify the current recollection of seven Bags, six from one roaster. That statement may describe later records not present in this export and should be verified against the current database or a newer complete export.

## Limitations

- This is descriptive analysis of one historical export, not a controlled test.
- It does not separate grinder settings, grind times, Hopper ranges, lifecycle positions, or system phases.
- `Include in Analysis` is blank on some historical rows.
- The CSV contains four shot-bearing Bags from one roaster, limiting generalization.
- No causal claim is made about why Bag 3 differs strongly from the other Bags.

## Conclusion

For the owner-confirmed System Phase 2 scope—Bags 3, 4 and 5 only—the verified Initial Grinder Output result is:

> **35 of 97 measured outputs, or 36.1%, landed within ±0.3 g of the 18.0 g target.**

This is a descriptive baseline only. It does not score Phase 2 against its actual objective, because Phase 2 intentionally held grind time relatively fixed and allowed correction/over-grind tradeoffs rather than chasing an uncorrected 18.0 g output.

The 54-of-125 result remains a valid whole-export comparison but is not the System Phase 2 result. The earlier greater-than-60% recollection is superseded for this CSV snapshot. Phase 3 should be evaluated separately against its explicit natural-18.0 g optimization objective using current records identified by date, query/export hash, denominator, system phase, and calculation.
