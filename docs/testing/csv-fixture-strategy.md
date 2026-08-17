# CSV Fixture Strategy

> **Status:** Draft testing policy  
> **Created:** 2026-08-17  
> **Purpose:** Separate committed CI fixtures from full Airtable export evidence  
> **Boundary:** Documentation only. This does not replace fixtures or change tests.

## Current Situation

Coffee Log currently has two kinds of CSV evidence:

1. Full offline Airtable exports stored outside the repository.
2. Smaller committed CSV fixtures used by automated tests.

These serve different purposes and should not be confused.

## Current Committed Fixtures

| Fixture | Records | Columns | SHA-256 | Current use |
| --- | ---: | ---: | --- | --- |
| `artifacts/api-server/test-fixtures/csv/Shots-Shots Entering-7.csv` | 164 | 93 | `34eb247193beba4370a00236c2355bf14ff8c576191a9eb040391424eb5f7a94` | Current Shot CSV import coverage |
| `artifacts/api-server/test-fixtures/csv/Hopper-Grid view.csv` | 12 | 8 | `b6e6363ad2809ed509d26c95139f6a9c1ebb334bfa40f73595709ec66ea10a69` | Hopper CSV parser coverage |
| `artifacts/api-server/test-fixtures/csv/Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 7 | `0abe697ac816ad57d315a2303a0a108c69b269773473ff162f555a6d249bdfd6` | Hopper Range Baseline parser coverage |

## Current Full Offline Exports

| Export | Records | Columns | Status |
| --- | ---: | ---: | --- |
| `Shots-Shots Entering.csv` | 235 | 93 | Full corrected visible Shot export |
| `Hopper-Hopper View.csv` | 17 | 9 | Full visible Hopper export |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 7 | Full visible Baseline export; same row/column shape as fixture |
| `Bags-Bags View.csv` | 6 | 59 | Full visible Bags export |
| `Beans-Beans View.csv` | 6 | 30 | Full visible Beans export |
| `Grinder Jam Events-Grid view.csv` | 5 | 14 | Full visible Grinder Jam Events export |
| `Shot Fault Rules-Shot Fault Rules.csv` | 12 | 3 | Full visible Shot Fault Rules export |
| `Project Notes-Project Notes View.csv` | 20 | 11 | Full visible Project Notes export |
| `10-Point Rating System-Rating Systems.csv` | 39 | 3 | Full visible Rating System export |
| `BSE Launch Economics-Grid view.csv` | 100 | 17 | Product/economics planning export |

## Key Difference

The committed fixtures are not the current full evidence package.

Known fixture/export differences:

- Shot fixture: 164 records; full export: 235 records.
- Hopper fixture: 12 records and 8 columns; full export: 17 records and 9 columns.
- Baseline fixture: same row/column shape as full export, but checksum differs from the full export documented in the offline audit.

This is acceptable only if the committed fixtures are treated as test fixtures, not canonical evidence.

## Policy

### Committed CI fixtures

Committed fixtures should be:

- Small enough for fast CI.
- Stable enough to make tests repeatable.
- Sanitized for public repository safety.
- Sufficient to cover parser, migration, relationship, and multi-select behavior.
- Accompanied by row count, column count, and checksum documentation.

Committed fixtures do not need to include every historical record.

### Full source exports

Full exports should be:

- Preserved outside source control until privacy and evidence policy is approved.
- Audited with row counts, column counts, and checksums.
- Used as migration evidence.
- Used to decide whether fixtures need refreshing.

Full exports should not be committed automatically.

## Fixture Refresh Decision

Do not replace fixtures automatically.

Before replacing or adding fixtures, decide:

1. Is the full 235-shot export safe to commit?
2. Does CI need full-history coverage, or is a smaller fixture better?
3. Should there be both:
   - a small fixture for fast CI, and
   - a larger fixture for explicit migration rehearsal?
4. Should Hopper fixture be updated from 12 rows/8 columns to 17 rows/9 columns?
5. Does the missing Hopper column represent a new field requiring parser coverage?
6. Should Bags, Beans, Grinder Jam Events, Shot Fault Rules, Rating System, and Project Notes receive committed fixtures?

## Recommended Test Tiers

| Tier | Fixture size | Purpose | Runs in CI? |
| --- | --- | --- | --- |
| Small parser fixtures | Minimal/sanitized | Fast parser and mapping coverage | Yes |
| Current representative fixtures | Medium | Current Airtable export shape coverage | Yes, if safe |
| Full export migration rehearsal | Full source export | Pre-release migration confidence | Optional/manual or scheduled |
| Private evidence archive | Full exports plus metadata | Source-of-truth audit trail | No public CI |

## Recommended Next Step

Create a fixture manifest before changing tests.

Suggested file:

```text
artifacts/api-server/test-fixtures/csv/MANIFEST.md
```

The manifest should list:

- Fixture filename.
- Source export.
- Export date.
- Record count.
- Column count.
- SHA-256.
- Why the fixture exists.
- Whether it is full, partial, sanitized, or historical.
- Known differences from the latest full export.

## Current Decision Point

The next implementation decision is whether to:

1. keep the existing fixtures unchanged,
2. replace them with the corrected full exports,
3. add new full-export fixtures alongside the smaller fixtures,
4. or create sanitized representative fixtures by hand.

This decision affects repository size, privacy exposure, CI speed, and migration confidence, so it should be approved before fixture files or tests are changed.
