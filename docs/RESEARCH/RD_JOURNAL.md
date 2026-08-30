# BigShotEspresso R&D Journal

> **Journal opened:** 2026-08-29  
> **Rule:** New experimental entries are contemporaneous from this date forward. Earlier work may be added only as clearly labelled `RETROSPECTIVE / reconstructed from existing records`.

## Journal rules

- Do not fabricate, embellish, backdate, or convert ordinary development into experimental work.
- Record failures, contradictory results, abandoned approaches, and missing evidence.
- Preserve raw evidence separately and link it; do not replace it with this narrative.
- Amend errors with a dated correction rather than silently rewriting a completed entry.
- Record facts, interpretations, and unresolved questions distinctly.
- An entry marked `PROPOSED` contains no experimental result.

## Experiment entry template

### Experiment ID

`BSE-RD-YYYY-###`

### Status

`PROPOSED | IN PROGRESS | COMPLETE | PAUSED | ABANDONED`

### Evidence timing

`CONTEMPORANEOUS | RETROSPECTIVE / reconstructed from existing records`

### Date / period

`YYYY-MM-DD` or an evidence-supported range

### Research area

Name the research area.

### Problem

What specific problem is being investigated?

### Technological uncertainty

What is not known, and why are established techniques or available knowledge insufficient in this context?

### Existing knowledge / baseline

Record the techniques, rules, documentation, literature, products, patents, or prior experiments reviewed. State their limits without assuming novelty.

### Hypothesis

State the testable hypothesis before execution where practical.

### Variables

#### Inputs

List measured or derived inputs.

#### Controlled variables

List intentionally held-constant conditions and uncontrolled/confounding variables.

#### Outputs / metrics

Define measurements, labels, success criteria, abstention criteria, and statistical treatment.

### Method

Describe the baseline/control, changed method, evaluation procedure, leakage controls, stop conditions, and reproducibility steps.

### Dataset

Record dataset/query/snapshot ID, shot IDs or ranges, inclusion/exclusion rules, provenance, extraction time, transformations, and privacy location.

### Expected result

What was expected before the result was observed?

### Actual result

Record numerical and qualitative results, failures, unexpected behaviour, missing data, and test output.

### Interpretation

What does the result support, contradict, or leave unresolved? Distinguish correlation from causation.

### Technological knowledge gained

What is now known that was not known before the experiment? If nothing reliable was learned, say so.

### Decision

`ACCEPT hypothesis | REJECT hypothesis | MODIFY hypothesis | INCONCLUSIVE`

### Next experiment

Identify the next test or explain why the line of inquiry stops.

### Supporting evidence

- Source commit/branch:
- Algorithm/configuration version:
- Dataset/query/snapshot:
- Tests and logs:
- Graphs/screenshots:
- Shot IDs:
- Design notes/conversations:
- External technical references:

### Corrections / amendments

Append dated corrections here; do not silently alter the historical record.

---

## Journal opening record — 2026-08-29

### Evidence timing

`CONTEMPORANEOUS`

### Record

The owner supplied an R&D, SR&ED, and funding handoff and directed that an R&D framework begin immediately. This journal and related registers were created in response.

### Confirmed at opening

- The repository already contains conceptual intelligence research for DCI, OSI, HMI, BLI, MSI, and GSP.
- The current roadmap does not authorize intelligence-engine implementation.
- Existing research documentation says no engine is implementation-ready.
- No new experiment was executed while creating this framework.

### Not established at opening

- No historical activity was classified as SR&ED-eligible.
- No prior-art search was completed by this framework-creation task.
- No baseline algorithm, scoring protocol, or qualifying dataset was approved.
- No technological advancement was claimed.

---

## Retrospective origin note — recorded 2026-08-29

### Evidence timing

`RETROSPECTIVE / owner recollection recorded 2026-08-29T18:38:13-05:00`

### Record

The owner reports approximately four years of AI experimentation, primarily since ChatGPT became available. After purchasing an espresso machine in approximately March 2026, the owner used ChatGPT to learn espresso preparation, repeatability, logging, tasting, and interpretation.

The original investigation was motivated by a grinder that doses by time. The owner wanted to determine how consistently it delivered the intended dose. The owner currently recalls that the grinder produced doses within approximately `±0.3 g` more than 60% of the time. The data is reported to come mainly from seven Bags, six from one roaster.

### Evidence boundary

This note records project origin and present recollection. It is not a contemporaneous experiment entry. The owner subsequently confirmed Initial Grinder Output as the metric and System Phase 2 as Bags 3, 4 and 5. The uploaded CSV verification found 35 of 97 measured Phase 2 outputs (36.1%) within ±0.3 g of the 18.0 g target; the eligible subset was 34 of 91 (37.4%). See [Initial Grinder Output Verification](DCI/initial-grinder-output-verification-2026-08-29.md). This descriptive result does not resolve Hopper/lifecycle or cross-Bag uncertainty.

### Research relevance

The origin question aligns with Dose Consistency Intelligence. The concentration of six of seven Bags from one roaster is both useful controlled context and a limitation on cross-roaster generalization. A future experiment may test the recalled observation once its protocol is defined.

### Operating-phase clarification — recorded 2026-08-29T18:46:15-05:00

The owner clarified that System Phase 2 (Bags 3–5) did not chase a natural 18.0 g Initial Grinder Output. Grind time was set near the beginning of a Bag and generally held there while the owner observed the process. The owner sometimes intentionally over-ground and removed excess because the grinder's reported minimum 0.2-second additional grind can produce approximately 0.5–0.7 g; correcting a 0.1–0.2 g under-dose that way can increase waste.

System Phase 3 consists of owner-confirmed Bags 6 and 7 and changes the objective to actively improve natural 18.0 g Initial Grinder Output hit rate. The owner confirmed that Bag 7 is present in the current app but absent from the uploaded CSV snapshot. The owner reports improvement across all relevant metrics. That improvement remains unverified until the current app's Bags 6–7 records are compared with an approved Phase 2 baseline and metric set.

### Current-app verification — 2026-08-29

Read-only queries of the current app compared Phase 2 Bags 3–5 with Phase 3 Bags 6–7. The ±0.3 g natural Initial Grinder Output hit rate increased from 55/126 (43.7%) to 27/49 (55.1%). Mean absolute error decreased from 0.575 g to 0.471 g and sample standard deviation decreased from 0.673 g to 0.583 g. These results support improved natural-output performance.

One measured Bag 7 shot has a blank structured System Phase, so Bag membership—not the incomplete `system_phase` field—was used to scope the comparison.

The more general statement that all metrics improved is not fully supported: top-up frequency decreased and no-correction frequency increased, but trim frequency and average plausible removed coffee increased, while sparse `grind_waste` data is not comparable. See [Phase 2 vs Phase 3 Current-App Comparison](DCI/phase-2-vs-phase-3-app-comparison-2026-08-29.md).

The 36.1% Phase 2 within-±0.3 g statistic is therefore descriptive and must not be interpreted as a Phase 2 success/failure score.

---

## BSE-RD-2026-001 — Establish baseline performance of espresso adjustment recommendations

### Status

`PROPOSED — NOT STARTED`

### Evidence timing

`CONTEMPORANEOUS proposal recorded 2026-08-29`

### Research area

Recommendation baseline evaluation

### Problem

BigShotEspresso needs a reproducible baseline against which later recommendation approaches can be compared.

### Technological uncertainty

To be finalized before execution. The current proposal does not yet establish why conventional approaches are insufficient or whether this baseline-establishment activity itself resolves a technological uncertainty.

### Existing knowledge / baseline

Candidate conventional rules include responses to sour/bitter outcomes and unusually fast/slow extraction. These mappings are illustrative only. They have not been defined precisely, sourced, approved, or encoded.

### Hypothesis

Not yet approved. A candidate hypothesis is that precisely defined conventional rules will provide a measurable but limited baseline on eligible historical shot sequences. This must be refined so “limited” and performance are defined before testing.

### Proposed method

For each qualifying historical sequence, hide the subsequent shot, generate a rule-based recommendation from the current shot, reveal the actual adjustment and next outcome, and score the recommendation using a pre-registered protocol.

### Required decisions before start

1. Exact baseline rules and precedence when signals conflict.
2. Dataset inclusion/exclusion and sequence definition.
3. Outcome label and what counts as improvement, deterioration, or unchanged.
4. Treatment of user-selected changes that differ from the recommendation.
5. Leakage controls and handling of missing values.
6. Minimum sample reporting and abstention behaviour.
7. Whether the same data may be used to define and evaluate rules.
8. Repository-safe location for raw evidence.

### Result

Not available. The experiment has not started.

### Decision

`INCONCLUSIVE — awaiting protocol approval and execution`

### Next experiment

None assigned until `BSE-RD-2026-001` is fully specified and executed.
