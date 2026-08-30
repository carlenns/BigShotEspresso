# Development Time Log

> **Opened:** 2026-08-29T18:34:05-05:00 (America/Winnipeg, CDT)  
> **Purpose:** Contemporaneous tracking of all BigShotEspresso work categories  
> **Boundary:** A category label records the nature of work; it does not establish SR&ED or funding eligibility.

## Recording rule

For future meaningful work sessions, record:

- start and completion timestamps in ISO 8601 with UTC offset;
- active hours, excluding unattended waits where practical;
- person or agent role;
- category and specific activity;
- experiment ID for experimental work;
- branch/commit, files, test output, conversation, or other evidence;
- whether the entry is contemporaneous or reconstructed.

Do not infer working hours from Git commit spans. If exact time is unavailable, use `not recorded` and add the evidence that does exist.

## Categories

- `R&D`
- `supporting R&D`
- `normal software development`
- `administration`
- `commercialization`
- `marketing`
- `documentation/governance`

## Time register

| Started | Completed | Active hours | Person/role | Category | Activity | Experiment | Evidence timing | Evidence |
|---|---|---:|---|---|---|---|---|---|
| Not recorded | 2026-08-29T18:34:56-05:00 | Not recorded | Owner + AI-assisted development | Documentation/governance | Created the retrospective effort reconstruction and contemporaneous time-log framework | — | Contemporaneous completion; start unavailable | This file and [effort reconstruction](../HISTORY/2026/development-effort-reconstruction-2026-08-29.md) |

## Entry template

Copy one row into the register:

```text
| YYYY-MM-DDTHH:MM:SS-05:00 | YYYY-MM-DDTHH:MM:SS-05:00 | 0.0 | Name/role | Category | Specific activity | BSE-RD-YYYY-### or — | Contemporaneous | Commit/test/data/conversation link |
```

## Daily summary template

Use only when a daily roll-up is helpful. Do not replace the session-level register with an unsupported estimate.

| Date | Total active hours | R&D | Supporting R&D | Product development | Other | Evidence status |
|---|---:|---:|---:|---:|---:|---|
| YYYY-MM-DD | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Complete / partial / reconstructed |

## Relationship to Git and experiments

- Git provides code chronology, not a complete timesheet.
- Formal experimental sessions must link their `BSE-RD` ID and journal entry.
- Product, commercialization, administration, and marketing work remain visible even when unrelated to an experiment.
- Corrections are appended with a timestamp; historical entries are not silently rewritten.
