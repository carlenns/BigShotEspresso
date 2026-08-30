# Development Effort Reconstruction — through 2026-08-28

> **Prepared:** 2026-08-29T18:34:56-05:00 (America/Winnipeg, CDT)  
> **Evidence timing:** RETROSPECTIVE / reconstructed from existing records  
> **Scope:** BigShotEspresso application development through the owner-alpha release candidate  
> **Excluded:** The owner's approximately five months of blogging and other work not directly attributable to application development  
> **Purpose:** Historical planning and effort context; not a payroll record, invoice, tax claim, or contemporaneous timesheet

## Summary

The owner reports approximately one month of actual application-development effort, with the final two weeks being especially intensive.

The repository evidence is consistent with that recollection:

- first recorded commit: `2246770` at `2026-05-28T23:37:31+00:00`;
- owner-alpha release-candidate declaration: `474c982` at `2026-08-28T15:08:40-05:00`;
- 211 commits through the release-candidate declaration;
- activity recorded on 22 distinct commit dates;
- 176 commits from 2026-08-15 through 2026-08-28, approximately 83% of the recorded commits.

Git proves that repository events occurred. It does not prove when uncommitted work began, how long a task took, whether work was continuous between commits, or who performed every non-code activity.

## Owner background and project origin

The following is an owner-reported retrospective account recorded on 2026-08-29. It provides domain and project context but is not independently verified by this document:

- The owner has been experimenting with AI for approximately four years, with most experience developing since ChatGPT became available.
- The espresso investigation began after the owner purchased an espresso machine in approximately March 2026; the exact purchase and investigation start dates are not yet recorded here.
- ChatGPT was used throughout the espresso-learning process to help the owner learn preparation, repeatability, logging, tasting, and interpretation.
- The initial practical question arose because the grinder doses by time: how consistently would a timed grinder produce the intended dose?
- The owner currently recalls discovering that timed doses fall within approximately **plus or minus 0.3 g** more than **60% of the time**.
- The present dataset is reported to come mainly from seven coffee Bags, six of them from one roaster.

The dose-consistency statement was initially recorded as a recollection. It has now been tested against the uploaded `Shots-Shots Entering-7.csv` snapshot using Initial Grinder Output against the 18.0 g target. For the owner-confirmed System Phase 2 scope (Bags 3, 4 and 5), the result is **35 of 97, or 36.1%, within ±0.3 g**, not more than 60%. The whole-export comparison, including Bag 2, is 54 of 125 or 43.2%. See the [verification record](../../RESEARCH/DCI/initial-grinder-output-verification-2026-08-29.md).

Before a broader product, research, funding, or performance claim is made, later/current records must still establish:

1. whether `±0.3 g` means deviation from the target dose, deviation from a mean/baseline, or a total observed range;
2. whether the measurement uses Initial Grinder Output, Actual Basket Dose, or another field;
3. the exact denominator, inclusion criteria, comparable grinder settings/times, Hopper conditions, and Bag lifecycle conditions;
4. the calculated percentage and sample count;
5. whether excluded, corrected, top-up, or over-grind records are included;
6. the degree to which six Bags from one roaster limit generalization.

This origin question is directly relevant to DCI and may support a future formal experiment after the metric and dataset are specified. It must not be retroactively presented as a pre-registered experiment.

## Estimated actual effort

Based on the owner's recollection and the activity pattern, a reasonable planning range is **180–280 focused hours**, with a midpoint of approximately **220–240 hours**.

This estimate is explicitly retrospective. It must not be converted into exact daily hours or used as contemporaneous time evidence. If later calendars, AI-conversation timestamps, invoices, terminal logs, or other records narrow the estimate, append a dated amendment rather than silently changing this statement.

## Conventional development-equivalent estimate

For planning or replacement-value context—not actual hours worked—the current owner-alpha system was estimated at approximately **800–1,300 conventional professional development hours**, depending on domain knowledge, reuse, quality expectations, team composition, and how much generated code and AI assistance are available.

This represents a rough comparison with conventional delivery. It is not the owner's time, a valuation, an eligible-expenditure amount, or evidence that a third party would charge for every estimated hour.

## Repository activity by commit date

Timestamps below are Git author timestamps. UTC entries have not been converted to Winnipeg time because preserving the recorded value avoids implying a local time that was not stored.

| Commit date | Commits | Earliest recorded author timestamp | Latest recorded author timestamp |
|---|---:|---|---|
| 2026-05-28 | 1 | 2026-05-28T23:37:31+00:00 | 2026-05-28T23:37:31+00:00 |
| 2026-06-09 | 5 | 2026-06-09T09:13:56+00:00 | 2026-06-09T10:04:21+00:00 |
| 2026-06-11 | 1 | 2026-06-11T09:44:14+00:00 | 2026-06-11T09:44:14+00:00 |
| 2026-06-17 | 10 | 2026-06-17T09:11:58+00:00 | 2026-06-17T20:59:58+00:00 |
| 2026-06-18 | 3 | 2026-06-18T23:25:42+00:00 | 2026-06-18T23:58:23+00:00 |
| 2026-06-19 | 1 | 2026-06-19T08:25:32+00:00 | 2026-06-19T08:25:32+00:00 |
| 2026-06-22 | 10 | 2026-06-22T09:36:22+00:00 | 2026-06-22T18:53:47+00:00 |
| 2026-06-23 | 1 | 2026-06-23T00:00:26+00:00 | 2026-06-23T00:00:26+00:00 |
| 2026-06-25 | 3 | 2026-06-25T04:35:39-05:00 | 2026-06-25T13:27:27-05:00 |
| 2026-08-15 | 3 | 2026-08-15T15:55:24-05:00 | 2026-08-15T19:50:24-05:00 |
| 2026-08-17 | 42 | 2026-08-17T09:19:35-05:00 | 2026-08-17T19:46:00-05:00 |
| 2026-08-18 | 3 | 2026-08-18T03:58:32-05:00 | 2026-08-18T06:58:54-05:00 |
| 2026-08-19 | 1 | 2026-08-19T05:05:33-05:00 | 2026-08-19T05:05:33-05:00 |
| 2026-08-20 | 8 | 2026-08-20T13:26:38-05:00 | 2026-08-20T19:31:37-05:00 |
| 2026-08-21 | 13 | 2026-08-21T05:33:40-05:00 | 2026-08-21T07:57:48-05:00 |
| 2026-08-22 | 4 | 2026-08-22T12:45:25-05:00 | 2026-08-22T13:04:57-05:00 |
| 2026-08-23 | 16 | 2026-08-23T04:55:11-05:00 | 2026-08-23T07:02:44-05:00 |
| 2026-08-24 | 26 | 2026-08-24T04:08:00-05:00 | 2026-08-24T08:20:21-05:00 |
| 2026-08-25 | 27 | 2026-08-25T03:28:11-05:00 | 2026-08-25T16:32:00-05:00 |
| 2026-08-26 | 7 | 2026-08-26T09:12:15-05:00 | 2026-08-26T10:09:53-05:00 |
| 2026-08-27 | 16 | 2026-08-27T03:20:35-05:00 | 2026-08-27T21:56:11-05:00 |
| 2026-08-28 | 10 | 2026-08-28T05:05:05-05:00 | 2026-08-28T15:08:40-05:00 |

## Evidence sources

- Git commit history through `474c982`.
- Owner statement on 2026-08-29: approximately one month of actual development, with the final two weeks especially intensive.
- Owner statement on 2026-08-29 describing approximately four years of AI experimentation, the March 2026 espresso-machine origin, ChatGPT-assisted espresso learning, timed-dose motivation, a recalled `±0.3 g`/greater-than-60% observation, and the seven-Bag/six-from-one-roaster dataset concentration.
- [Owner-Alpha RC Report](../../implementation/owner-alpha-rc-report-2026-08-28.md).
- [Completed Tasks](../../completed-tasks.md).

## Known limitations

- Commit count is not proportional to hours or complexity.
- Commit spans are not working-time records.
- Git author time may use different time zones and can be altered.
- Requirements discovery, testing, data work, AI conversations, deployment work, and documentation may occur outside Git timestamps.
- Generated files and migrations can inflate line counts without proportional hand-written effort.
- Parallel AI assistance can compress calendar time without eliminating owner review and decision effort.

## Amendment log

### 2026-08-29T18:34:56-05:00

Initial reconstruction created. No exact historical daily hours were assigned.

### 2026-08-29T18:38:13-05:00

Added the owner's retrospective AI background, espresso-project origin, timed-grinder motivation, recalled dose-consistency observation, and dataset concentration. The numerical observation remains unverified pending a defined query and metric.

### 2026-08-29 — CSV verification amendment

The owner confirmed that Initial Grinder Output is the intended metric. Analysis of the uploaded `Entering-7` shot CSV found 54 of 125 measured outputs (43.2%) within ±0.3 g of the 18.0 g target. The earlier greater-than-60% recollection is retained as historical recollection but superseded for this snapshot. The uploaded shot CSV contains four shot-bearing Bags, all from De Luca's; the Bags export contains five De Luca's Bags.

The owner then identified System Phase 2 as Bags 3, 4 and 5 only. Recalculation for that scope found 35 of 97 (36.1%) within ±0.3 g; the eligible subset was 34 of 91 (37.4%). Bag 2 remains an excluded comparison, not part of the Phase 2 result.

The owner further clarified that Phase 2 did not optimize natural 18.0 g hits: grind time was set near the beginning of a Bag and generally held fixed, and deliberate over-grinding/removal was sometimes used to avoid an inefficient minimum top-up. The 36.1% figure is therefore descriptive, not a Phase 2 success score. Phase 3 uses Bags 6 and 7 and changes the objective to natural 18.0 g optimization; reported improvement remains to be verified from those Phase 3 records.

Current-app verification subsequently found that the ±0.3 g hit rate improved from 43.7% in Phase 2 to 55.1% in Phase 3, with lower mean absolute error and output variability. Correction and waste measures were mixed, so the narrower natural-output improvement is the supported conclusion. See the [current app comparison](../../RESEARCH/DCI/phase-2-vs-phase-3-app-comparison-2026-08-29.md).
