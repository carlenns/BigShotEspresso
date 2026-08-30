# BigShotEspresso R&D Master Plan

> **Status:** Active documentation framework; no intelligence-engine implementation authorized  
> **Established:** 2026-08-29  
> **Project:** BigShotEspresso  
> **Location:** Manitoba, Canada  
> **Business status:** Unincorporated, as reported by the owner on 2026-08-29  
> **Authority:** Subordinate to the [Project Constitution](../PROJECT_CONSTITUTION.md), [Roadmap](../ROADMAP.md), approved ADRs, and current evidence  
> **Professional-advice boundary:** This is an engineering evidence framework, not legal, tax, accounting, funding, or patent advice.

## Purpose

This framework separates ordinary product development from experimental work and preserves evidence needed to determine later whether any work may qualify for Canadian SR&ED or other innovation programs.

It does not declare that BigShotEspresso, any activity, or any expenditure is eligible. Eligibility must be assessed from the work actually performed, the evidence retained, the claimant's legal/tax status, and current program rules.

## Research objective

Investigate whether a personalized computational model can learn useful relationships among coffee, equipment, extraction parameters, historical behaviour, bag lifecycle, and human sensory preference well enough to reduce the number of shots required to reach a user's preferred espresso result.

The immediate technological objective is narrower:

> Determine whether reliable, individualized adjustment recommendations can be generated from sparse, noisy, interacting extraction and sensory observations, while exposing uncertainty and returning “insufficient evidence” when warranted.

## Product development versus experimental R&D

Classify work before it begins where practical. Classification records intent; it does not determine tax eligibility.

### Normal product development

Examples include authentication, account/profile work, ordinary CRUD, routine UI/API implementation, standard database migrations, backups, deployment, payments, conventional security work, and ordinary bug fixes.

### Candidate experimental R&D

Work may enter the experiment process when it investigates a genuine technological uncertainty through systematic experiment or analysis. Examples may include competing similarity methods, evidence weighting, bag-age normalization, contradictory sensory evidence, confidence calibration, sequential-shot modelling, and personalized versus generalized recommendations.

### Supporting R&D

Work directly supporting an active experiment must be linked to that experiment and distinguished from general infrastructure. No cost or time category in this repository is a claim of SR&ED eligibility.

## Core uncertainties to investigate

1. Whether sparse personal shot histories contain enough signal for useful recommendations.
2. Which variables make historical shots meaningfully comparable and how their importance changes by context.
3. Whether static rules, adaptive weighting, statistical methods, machine learning, or a hybrid performs best.
4. Whether bag-age or lifecycle normalization improves recommendations without overfitting.
5. Whether structured sensory observations remain useful despite subjectivity and inconsistency.
6. How contradictory observations should reduce confidence.
7. Whether confidence can be calibrated meaningfully with small, noisy samples.
8. How to balance generalized espresso knowledge against individualized evidence.
9. How to distinguish random shot variation from a persistent trend.
10. Whether sequential history is more predictive than isolated similarity.
11. How much data is needed before personalization outperforms conventional rules.
12. Whether the system can reliably identify “repeat/no adjustment” as the best action.

These are research questions, not established technological uncertainties or funding claims. Each experiment must state the uncertainty actually encountered and the existing knowledge reviewed.

## Program phases

| Phase | Research focus | Entry condition | Exit evidence |
|---|---|---|---|
| R1 | Baselines | Rules and evaluation protocol approved | Reproducible baseline results |
| R2 | Similarity | R1 dataset/protocol available | Compared similarity approaches and results |
| R3 | Recommendation | R2 comparison evidence available | Tested recommendation approaches |
| R4 | Confidence | Recommendation outputs can be scored | Calibration and abstention evidence |
| R5 | Temporal/bag lifecycle | Dates and lifecycle evidence verified | Tested temporal approaches |
| R6 | Personalization | Sufficient per-user evidence and privacy controls | Personalized versus non-personalized comparison |
| R7 | Cross-user generalization | Multiple-user consent, governance, and data sufficiency | Cold-start comparison with privacy evidence |

This research sequence does not alter the constitutional product roadmap or authorize Phases 3–9 of that roadmap.

## Required experiment lifecycle

Every formal experiment follows:

1. Assign `BSE-RD-YYYY-###`.
2. State the problem, technological uncertainty, and existing baseline.
3. Record the hypothesis before testing where practical.
4. Define inputs, controls, outputs, metrics, dataset inclusion/exclusion, and stop conditions.
5. Preserve raw inputs, code/version, generated output, logs, and subsequent outcome.
6. Record expected and actual results, including negative or inconclusive results.
7. State knowledge gained without overstating causality.
8. Decide `ACCEPT`, `REJECT`, `MODIFY`, or `INCONCLUSIVE`.
9. Link commits, data, tests, screenshots, queries, and discussions.
10. Register the next experiment or explicitly close the line of inquiry.

The complete entry template is maintained in [RD_JOURNAL.md](RD_JOURNAL.md).

## Evidence chain

Where practical, every evaluated recommendation must be traceable through:

```text
input data
  -> dataset snapshot/query
  -> algorithm and configuration version
  -> recommendation
  -> confidence/abstention output
  -> user action
  -> next shot
  -> outcome
  -> interpretation
```

Raw source records must remain preserved. Derived datasets need provenance, inclusion criteria, creation date, and code/query version.

## Recommendation-engine versioning

Do not overwrite experimental behaviour without a version record. Version labels are assigned only when an implementation or reproducible specification exists.

Illustrative sequence only (not current implementation):

- `v0.1` fixed rules
- `v0.2` nearest historical shot
- `v0.3` weighted similarity
- `v0.4` lifecycle-aware weighting
- `v0.5` confidence/abstention
- `v0.6` sequential modelling

Each actual version must record its experiment IDs, source revision, configuration, dataset, and reason for creation or retirement.

## Baseline policy

Candidate baselines are:

- generic espresso rules;
- most recent eligible shot;
- nearest numerical eligible shot;
- human/user-selected adjustment.

No baseline rule, threshold, sensory mapping, or success metric is approved merely by appearing here. `BSE-RD-2026-001` must define them precisely before execution.

Candidate metrics include recommendation direction, subsequent improvement/deterioration/unchanged outcome, abstention, shots required to reach a preferred result, and confidence calibration. Metric definitions and labelling protocol must be fixed before scoring.

## Research-data rules

- Preserve `Include in Analysis` as the central analytical eligibility control under ADR-0004.
- Keep active-Bag analysis isolated unless a cross-Bag analysis is explicitly named.
- Do not infer Reference Shot, Signature Shot, sensory state, or success from ratings.
- Preserve technical `Rating` and personal `Preference Rating` as distinct measures.
- Treat retrospective records as retrospective and identify the evidence used to reconstruct them.
- Preserve failures and supersede interpretations; do not rewrite history.
- Do not place private source exports, personal information, secrets, or sensitive raw data in Git without an approved evidence-storage and privacy decision.

## Time and cost records

Time should be recorded contemporaneously with date, hours, category, activity, experiment ID if applicable, person, and evidence link. Suggested categories are `R&D`, `supporting R&D`, `normal software development`, `administration`, `commercialization`, and `marketing`.

Costs should retain vendor, invoice/receipt, date, amount, currency, purpose, project association, payment evidence, and any experiment link. Recording a cost does not imply eligibility.

Financial records should live in an access-controlled accounting location. This repository may contain a non-sensitive index or pointer, but should not become the sole receipt archive.

Record future work in the [Development Time Log](DEVELOPMENT_TIME_LOG.md). Historical estimates belong in explicitly retrospective records and must not be presented as exact contemporaneous hours.

## AI-assisted development evidence

Important AI conversations may support chronology and technical reasoning but are not sufficient alone. Link relevant conversations to an experiment, code revision, test, dataset, result, and conclusion. Record material model-generated hypotheses as proposals until tested.

## Git practice

Where practical, use the experiment ID in branches, commits, test-output folders, and journal links, for example:

`BSE-RD-2026-004: test recency-weighted similarity`

Do not amend or rewrite commits to manufacture contemporaneous evidence.

## Funding and IP boundaries

Funding-program statements supplied in the 2026-08-29 handoff are planning assertions that require current official verification before reliance. Incorporation, SR&ED, NRC IRAP, Manitoba programs, tax-credit treatment, eligible expenditures, deadlines, and funding limits can change.

Do not incorporate solely to pursue a program. Do not publicly disclose potentially patent-sensitive details without an owner decision and appropriate professional advice. Maintain authorship, contributor, contractor-assignment, algorithm/version, and disclosure records where applicable.

## Immediate controls

- `BSE-RD-2026-001` is proposed, not started.
- No historical experiment is claimed by this initial framework.
- No prior-art search is represented as complete.
- No recommendation engine or confidence threshold is authorized for implementation.
- First execution requires an approved baseline specification, dataset protocol, and outcome-scoring method.

## Related records

- [R&D Journal](RD_JOURNAL.md)
- [Experiment Index](EXPERIMENT_INDEX.md)
- [Prior Art and Existing Knowledge](PRIOR_ART_AND_EXISTING_KNOWLEDGE.md)
- [Technological Advancements](TECHNOLOGICAL_ADVANCEMENTS.md)
- [Failed Approaches](FAILED_APPROACHES.md)
- [Intelligence Engine Map](../intelligence-engine-map.md)
- [Research Index](README.md)
