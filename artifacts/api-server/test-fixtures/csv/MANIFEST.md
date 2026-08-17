# CSV Test Fixture Manifest

> **Status:** Active fixture manifest  
> **Created:** 2026-08-17  
> **Purpose:** Document committed CSV fixtures used by automated tests  
> **Boundary:** These fixtures are test artifacts. They are not the complete Airtable evidence archive.

## Fixture Policy

Committed CSV fixtures exist to make CI and local tests repeatable.

They should be:

- intentional,
- reviewable,
- small enough for routine CI,
- safe for the repository,
- and documented with row counts, column counts, checksums, and known differences from current source exports.

Full Airtable exports remain local/private evidence until a separate evidence-retention and privacy decision is approved.

## Current Fixtures

| Fixture | Source role | Records | Columns | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `Shots-Shots Entering-7.csv` | Representative Shot import fixture | 164 | 93 | `34eb247193beba4370a00236c2355bf14ff8c576191a9eb040391424eb5f7a94` |
| `Hopper-Grid view.csv` | Representative Hopper import fixture | 12 | 8 | `b6e6363ad2809ed509d26c95139f6a9c1ebb334bfa40f73595709ec66ea10a69` |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | Hopper Range Baseline import fixture | 5 | 7 | `0abe697ac816ad57d315a2303a0a108c69b269773473ff162f555a6d249bdfd6` |

## Known Differences From Current Full Exports

Current full offline Airtable exports are stored outside the repository at:

```text
/Users/carlenns/Documents/Airtable Tables/Coffee Log/
```

Known differences as of 2026-08-17:

| Area | Committed fixture | Current full export | Decision |
| --- | ---: | ---: | --- |
| Shots records | 164 | 235 | Keep smaller fixture for CI until fixture strategy is approved |
| Shots columns | 93 | 93 | Shape matches current full export |
| Hopper records | 12 | 17 | Keep smaller fixture for CI until fixture strategy is approved |
| Hopper columns | 8 | 9 | Missing full-export column requires future parser/test decision |
| Hopper Range Baseline records | 5 | 5 | Shape matches current full export |
| Hopper Range Baseline columns | 7 | 7 | Shape matches current full export |
| Hopper Range Baseline checksum | fixture checksum differs | full export checksum differs | Same shape, contents/order may differ; review before replacement |

## Full Export Checksums For Comparison

These checksums document the current local full export package. The files themselves are not committed.

| Full export | Records | Columns | SHA-256 |
| --- | ---: | ---: | --- |
| `10-Point Rating System-Rating Systems.csv` | 39 | 3 | `82282c3fa5e109278ca8eef96879da34fbf2f911d29f165c5223e3eb9e343025` |
| `BSE Launch Economics-Grid view.csv` | 100 | 17 | `eb1d2a51f670e895b2847f4dcd2687571d70558ed224103604184293c5d7ba41` |
| `Bags-Bags View.csv` | 6 | 59 | `e4ef6be6ada633b6e786d6f0ea609118e0bff21ca79339c711215750eb0fc1aa` |
| `Beans-Beans View.csv` | 6 | 30 | `379291c33d9d41d697684be49a414e4f04f2b5b9722be5d668b419200252dd6c` |
| `Grinder Jam Events-Grid view.csv` | 5 | 14 | `e1f7ae63eaae9047c5baa06d34e1da23abc0a6b5170811436ea10c79f04a2847` |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 7 | `af688162cc3892800d0351cc9cde869e0a5d775461dda12c83adaa611c72d8d3` |
| `Hopper-Hopper View.csv` | 17 | 9 | `de9e1a03c7afcb22d02e3f77ef5b234e5b6fd19645a2254f2a3818425a1ddb28` |
| `Project Notes-Project Notes View.csv` | 20 | 11 | `3134ce59f1c19beae4389af9f6a10fb529a55bae7d6a9173f3b90f21d98c2f01` |
| `Shot Fault Rules-Shot Fault Rules.csv` | 12 | 3 | `a7016f754b9f83555aff8e13e7fd531306f9930ad5cfcbaf45cc57ca141c1ad1` |
| `Shots-Shots Entering.csv` | 235 | 93 | `780957e87d5b81c35d2e97e59f76f25cd8b334c6c8cd7688055b40bde4c5d5f4` |

## Replacement Rule

Do not replace committed fixtures just because a newer export exists.

Fixture replacement requires an explicit decision covering:

1. privacy/sensitivity of the new export,
2. repository size,
3. CI runtime,
4. whether the fixture is full, partial, representative, sanitized, or historical,
5. expected test coverage change,
6. and whether full-export evidence should remain local/private instead.

## Next Approved Fixture Step

The next safe fixture step is to decide whether the project needs:

- small CI fixtures only,
- full migration fixtures,
- both small and full fixtures,
- or sanitized representative fixtures.

Until then, keep current fixture files unchanged.
