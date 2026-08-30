# System Phase 2 vs Phase 3 — current app comparison

> **Queried:** 2026-08-29 (America/Winnipeg)  
> **Source:** Current BigShotEspresso Postgres application database, read-only queries  
> **Phase scope confirmed by owner:** Phase 2 = Bags 3–5; Phase 3 = Bags 6–7  
> **Primary metric:** `initial_grind_weight` / Initial Grinder Output relative to 18.0 g  
> **Status:** Retrospective descriptive comparison; not a controlled or pre-registered experiment

## Context

The phases had different operating objectives:

- **Phase 2:** establish the scientific process and observe timed-output behaviour while generally holding the grind time selected near the beginning of each Bag. Natural 18.0 g hits were not actively optimized. Deliberate over-grinding/removal could be used to avoid an inefficient minimum top-up.
- **Phase 3:** actively adjust timed grinding to improve the probability that natural Initial Grinder Output lands at 18.0 g before correction.

The comparison demonstrates observed change between eras. It does not prove that the phase strategy alone caused the change because coffee, roaster, Bag, grinder settings, Hopper conditions, lifecycle timing, and other factors also changed.

## Data coverage

| Phase | Bags | Shot records | Measured Initial Grinder Outputs | Date coverage stored in app |
|---|---|---:|---:|---|
| Phase 2 | 3, 4, 5 | 146 | 126 | 2026-05-10 through 2026-07-19 |
| Phase 3 | 6, 7 | 55 | 49 | 2026-07-19 through 2026-08-29 |

The current app contains materially more data than the uploaded CSV snapshot, particularly for Bag 5, and is the appropriate current source for this comparison.

## Natural Initial Grinder Output metrics

| Metric | Phase 2 | Phase 3 | Observed change |
|---|---:|---:|---:|
| Within ±0.3 g of 18.0 g | 55 / 126 (43.7%) | 27 / 49 (55.1%) | **+11.4 percentage points** |
| Mean absolute error from 18.0 g | 0.575 g | 0.471 g | **−0.104 g (18.1% lower)** |
| Initial-output sample standard deviation | 0.673 g | 0.583 g | **−0.090 g (13.4% lower)** |
| Absolute mean bias from 18.0 g | 0.302 g | 0.267 g | **−0.035 g (11.6% lower)** |
| Mean Initial Grinder Output | 17.698 g | 18.267 g | Shifted from 0.302 g under to 0.267 g over |

The primary natural-output metrics support the owner's statement that Phase 3 improved performance. The ±0.3 g hit rate has not yet exceeded 60% across Phase 3 as a whole.

### Analysis-eligible subset

Rows explicitly marked `Include in Analysis = true` show:

- Phase 2: 53 of 119, or 44.5%, within ±0.3 g;
- Phase 3: 25 of 45, or 55.6%, within ±0.3 g.

This is a +11.1 percentage-point change and is consistent with the all-measured result.

## Correction-pattern metrics

Percentages below use measured Initial Grinder Output rows.

| Metric | Phase 2 | Phase 3 | Interpretation |
|---|---:|---:|---|
| No correction recorded | 4.0% | 12.2% | Improved |
| Under → Top-Up | 62.7% | 18.4% | Strong reduction |
| Over → Trim | 33.3% | 69.4% | Increased; consistent with shifting from under-output to over-output, not automatically an improvement |
| Average plausible top-up (0–3 g values) | 1.036 g | 0.889 g | Lower, but still conditional on needing a top-up |
| Average plausible coffee removed (0–3 g values) | 0.407 g | 0.471 g | Higher; does not support improvement for this measure |

Four Phase 2 correction rows contain values greater than 3 g and were excluded from the “plausible” correction-size averages pending data review. No Phase 3 correction row exceeded 3 g.

## Waste-data limitation

`grind_waste` is populated on only 19 measured Phase 2 rows and 6 measured Phase 3 rows, with large values indicating that it may represent broader maintenance/purge events rather than ordinary dose correction alone. It is not sufficiently complete or comparable to conclude whether total waste improved.

Waste should be evaluated using a defined reconciliation that separates:

- ordinary top-up output not placed in the basket;
- Over Grind Removed;
- grind-change purge;
- retention/cleanout loss;
- lifecycle maintenance waste;
- beans remaining or reconciled at Bag/Hopper transitions.

## Phase-label data-quality finding

The owner-defined Bag membership is the authority for this comparison. One measured Bag 7 shot (`shots.id = 261`, Initial Grinder Output 18.9 g) has a blank structured `system_phase`. A query filtering only `system_phase = 3` would incorrectly exclude it and report 48 rather than 49 measured Phase 3 outputs. The comparison therefore scopes Phase 3 by `bag_id IN (6, 7)`.

## Conclusion

The current application data supports meaningful Phase 3 improvement in the primary natural-output objective:

> **The Initial Grinder Output ±0.3 g hit rate increased from 43.7% in Phase 2 to 55.1% in Phase 3, while mean absolute error and output variability both decreased.**

The broader statement that “all metrics improved” is only partly supported. Natural-output accuracy, variability, no-correction rate, and top-up frequency improved. Trim frequency increased, average plausible removed coffee increased slightly, and the sparse waste field cannot support a reliable comparison.

This comparison should become the baseline for a prospective Phase 3 experiment only after metrics, exclusions, Hopper/lifecycle controls, and stop conditions are approved.
