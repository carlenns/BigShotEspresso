# BigShotEspresso Intelligence Engine Map

## Shared rules

- Every performance calculation uses only `Include in Analysis = true`.
- Active-bag outputs remain isolated to the active Bag unless a cross-bag view is explicitly named and labelled.
- Manual Reference, Signature, Sour, Boundary, and Important-to-Intelligence flags are never inferred from ratings.
- Formula details not present in CSVs or dated Project Notes remain unresolved.

## DCI — Dose Consistency Intelligence

**Question:** How accurate and repeatable is the timed grinder output?

### Inputs

Grind Time, Grinder Setting, Initial Output, Total Output, target dose, actual basket Dose, correction type/amount, Time Adj, Top-Up Grind, Over Grind Removed, Output Delta, Actual Dose Error, Hopper Range/fullness, baseline output, Bag and days open.

### Outputs

- Initial-output mean, spread, and variance for comparable conditions.
- Error from target dose and hopper-range baseline.
- Under/over-dose frequency.
- Top-up/trim frequency and magnitude.
- Stability by grind time, setting, bag age, and hopper state.
- Confidence based on comparable observation count.

### Calculation status

Arithmetic differences and descriptive distributions are supported. No universal “consistent” threshold is specified; thresholds must come from Airtable formulas, user-approved calibration, or empirical windows.

### Dashboard use

Timed-dose stability, correction burden, hopper-related output drift, and confidence.

## OSI — Operational Success Intelligence

**Original research question:**

> How operationally successful is timed dosing when basket dose is not weighed?

OSI is separate from DCI. DCI measures dose accuracy/repeatability. OSI evaluates whether that measured behavior is operationally sufficient to produce successful espresso without weighing the basket.

### Required concepts

| Concept | Definition |
|---|---|
| Initial Grinder Output | Grounds produced by the programmed timed grind before top-up or removal. |
| Actual Basket Dose | Coffee actually placed in the basket for extraction (`Dose (g)`). |
| Dose Variance | Difference/distribution between Initial Output, target dose, and Actual Basket Dose. |
| Timed-dose variance | Variation of Initial Output under comparable grind time, setting, bag, and hopper conditions. |
| Yield Target Window | Bag/reference-supported acceptable beverage-yield range. |
| No-Weigh Operation Mode | Simulated or future workflow where Initial Output becomes the assumed basket dose and correction is omitted. |
| Historical Success Window | Empirical ranges from eligible historical shots that produced approved outcomes under comparable conditions. |

### Inputs

All DCI inputs plus Yield, ratio, timing metrics, ratings, Reference Shot, fault/finished/rated state, target/reference windows, and Include in Analysis.

### No-weigh shot simulation

For each historically weighed, eligible shot:

1. Treat Initial Output as the hypothetical basket dose.
2. Remove the effect of trim/top-up correction.
3. Compare hypothetical dose with target and historically successful dose windows.
4. Recalculate the hypothetical brew ratio using actual Yield divided by Initial Output.
5. Compare yield, timing, and outcome with the approved historical success window.
6. Aggregate probability/confidence by comparable grind time, setting, bag phase, and hopper range.

This is a retrospective estimate, not proof of taste outcome. It must expose sample size and avoid invented success cutoffs.

### Outputs

- Probability that timed output lands inside the approved dose window without weighing.
- Probability that a no-weigh simulation also lands inside yield/ratio success windows.
- Expected under/over-dose risk and correction avoided.
- Operational success by hopper range, bag phase, grind time, and setting.
- “Insufficient evidence” when comparable history is too small.

### Historical success window

Use approved eligible-shot evidence such as manually marked Reference Shots and user-approved bag windows. Do not equate “high rating” with Reference Shot or silently create a threshold.

### Dashboard use

“Could this setup be run reliably without weighing?” with probability, conditions, sample count, and principal risks.

## GSP — Grind Success Predictor

**Question:** Which grind settings and extraction conditions historically produce successful shots?

Inputs: active Bag, setting, grind time, actual dose, yield, temperature, Pour Delay, Pour Time, Flow Time, Reference/Signature flags, ratings, classifications, and lifecycle/hopper context.

Outputs: historically successful setting/timing windows, next-setting evidence, and confidence. Predictions must be bag-scoped first and must distinguish correlation from causation.

**Naming note:** a separate backlog document uses “GSP” for “Great Shot Potential.” That older concept must be renamed or explicitly namespaced before implementation; it is not silently merged with Grind Success Predictor.

## MSI — Model Exception Intelligence

**Question:** Why did mechanically similar or apparently ideal shots produce different sensory outcomes?

Inputs: timing/yield/ratio, Flow Diagnostic/Score, model Zone, Taste Zone, Agreement %, Model Flag, ratings, Sour/Boundary flags, classifications, Important to Intelligence, lesson types, bag age, hopper state, and notes.

Outputs:

- Match versus mismatch cases.
- Clusters of similar mechanics with divergent taste.
- Hidden-variable candidates such as hopper depletion, cooling evolution, workflow variation, or bag age.
- Evidence packages for model refinement, not automatic causal claims.

The Project Notes formula evidence defines:

- Zone Score: Center 3, Edge 2, Outside 1.
- Taste Score: analogous sensory score.
- Agreement: `1 - ABS(score difference) / 2`.
- Shot Quality Score: Flow Score 40% + Agreement 30% + Rating/10 30%.
- Tier thresholds recorded in Project Notes.

These formulas require confirmation against current Airtable formulas before implementation.

## BLI — Bag Lifecycle Intelligence

**Question:** How does a bag’s performance and forgiveness change from opening to completion?

Inputs: opened/roast/end dates, days open, shots, eligible ratings/preferences, references/signatures, grind drift, timing windows, hopper phase/fullness, and fault/model-exception patterns.

Outputs: lifecycle phase, dial-in speed, stable/peak/declining windows, forgiveness, repeatability, aging risk, and bag-size/rebuy evidence.

Project evidence warns against treating age as a single cause: late-bag quality can remain high while the operating window narrows.

## HMI — Hopper Mechanics Intelligence

**Question:** How does hopper state affect grinder output, correction behavior, and shot success?

### Inputs

Hopper state records, starting/current mass, percentage/range/zone, fill and top-up events, phase, Initial Output, baseline output, output delta, correction type/amount, top-up/trim frequency, waste, Flow Score/offset, bag age, and eligible sensory outcomes.

### Required analyses

- Hopper fullness effects on Initial Output.
- Top-up frequency and magnitude by range.
- Dose-correction direction and burden by range.
- Actual output versus Hopper Range Baseline.
- Stable/drop behavior and severity.
- Interactions with bag age, setting, grind time, DCI, and OSI.

### Outputs

Baseline deviation, likelihood of hopper effect, correction burden, threshold/severity state, and evidence-backed recommendation. HMI must not assume lower hopper always causes lower output; Project Notes explicitly record mixed evidence.

### Hopper baseline comparisons

Compare Initial Output to the maintained baseline for the assigned Hopper Range. Report baseline status, adjustment date, observation count, and confidence. Baselines are calibration records, not universal constants.

### Dashboard use

Current hopper state, output deviation, top-up risk, baseline confidence, and whether no-weigh operation is currently advisable.

## Engine dependencies

```text
Hopper state ──> HMI ─┬─> DCI ──> OSI
Bag lifecycle ─> BLI ─┤
Mechanical data ──────┴─> GSP
Mechanical + sensory ───> MSI
```

OSI requires DCI evidence and is conditioned by HMI and BLI. MSI consumes outputs from mechanical engines to explain exceptions rather than replacing them.

## Confidence policy

Every engine output must show sample count, scope, and evidence source. Confidence thresholds themselves are unresolved unless explicitly present in Airtable formulas or approved documentation. Sparse or mixed evidence returns “insufficient evidence,” not a fabricated recommendation.
