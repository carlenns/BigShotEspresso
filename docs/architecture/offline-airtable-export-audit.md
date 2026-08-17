# Offline Airtable Export Audit

> **Audit date:** 2026-08-17
>
> **Export source:** `/Users/carlenns/Documents/Airtable Tables/Coffee Log/`
>
> **Audit type:** Offline CSV evidence review while live Airtable API verification is blocked by account/API limits
>
> **Result:** Complete visible CSV package received for offline review; live Airtable metadata verification remains blocked

## Executive summary

The Coffee Log Airtable base has been exported as 10 CSV files. This provides an offline evidence package that can be used while the Airtable API is unavailable or rate-limited.

The corrected `Shots-Shots Entering.csv` export now contains 235 records and 93 columns. This supersedes the earlier 19-record current-month/filtered export that was initially found in the export folder.

The export is strong enough to verify table names, visible exported fields, row counts, checksums, relationship labels, and current source values. It cannot fully verify Airtable field types, hidden fields, field IDs, formulas, automations, view filters, or linked-record cardinality without live metadata or another schema export.

The user noted that coffees from August 17, 2026 still need to be added. This audit does not add those records and does not infer their values. They should be handled as a separate data-entry/import task after the user provides shot details or an updated export.

## Export inventory

| CSV file | Records | Non-empty records | Columns | SHA-256 |
|---|---:|---:|---:|---|
| `10-Point Rating System-Rating Systems.csv` | 39 | 34 | 3 | `82282c3fa5e109278ca8eef96879da34fbf2f911d29f165c5223e3eb9e343025` |
| `BSE Launch Economics-Grid view.csv` | 100 | 100 | 17 | `eb1d2a51f670e895b2847f4dcd2687571d70558ed224103604184293c5d7ba41` |
| `Bags-Bags View.csv` | 6 | 6 | 59 | `e4ef6be6ada633b6e786d6f0ea609118e0bff21ca79339c711215750eb0fc1aa` |
| `Beans-Beans View.csv` | 6 | 6 | 30 | `379291c33d9d41d697684be49a414e4f04f2b5b9722be5d668b419200252dd6c` |
| `Grinder Jam Events-Grid view.csv` | 5 | 5 | 14 | `e1f7ae63eaae9047c5baa06d34e1da23abc0a6b5170811436ea10c79f04a2847` |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 5 | 7 | `af688162cc3892800d0351cc9cde869e0a5d775461dda12c83adaa611c72d8d3` |
| `Hopper-Hopper View.csv` | 17 | 17 | 9 | `de9e1a03c7afcb22d02e3f77ef5b234e5b6fd19645a2254f2a3818425a1ddb28` |
| `Project Notes-Project Notes View.csv` | 20 | 20 | 11 | `3134ce59f1c19beae4389af9f6a10fb529a55bae7d6a9173f3b90f21d98c2f01` |
| `Shot Fault Rules-Shot Fault Rules.csv` | 12 | 12 | 3 | `a7016f754b9f83555aff8e13e7fd531306f9930ad5cfcbaf45cc57ca141c1ad1` |
| `Shots-Shots Entering.csv` | 235 | 235 | 93 | `780957e87d5b81c35d2e97e59f76f25cd8b334c6c8cd7688055b40bde4c5d5f4` |

## Table-level findings

### `10-Point Rating System-Rating Systems.csv`

- Exported records: 39
- Exported columns: 3
- Columns already mentioned in current documentation corpus by exact-name search: 3
- Exact-name documentation coverage: complete by simple search.

Fields exported:

`Section`, `Item`, `Description`

### `BSE Launch Economics-Grid view.csv`

- Exported records: 100
- Exported columns: 17
- Columns already mentioned in current documentation corpus by exact-name search: 2
- Columns not found by exact-name search in current docs: 15

  - `Scenario`
  - `Paid Users`
  - `Founder Users`
  - `Standard Users`
  - `Stripe Fees Base USD/mo`
  - `Stripe Fees Stress USD/mo`
  - `Replit Infra Base USD/mo`
  - `Vercel + Neon Prod USD/mo`
  - `Other Ops Reserve USD/mo`
  - `Contribution Profit Base USD/mo`
  - `Contribution Profit Stress USD/mo`
  - `Base Margin`
  - `Base Profit CAD/mo`
  - `Est DB Storage Year 1 GB`
  - `Scale Recommendation`

Fields exported:

`Scenario`, `Paid Users`, `Founder Users`, `Standard Users`, `MRR USD`, `ARR USD`, `Stripe Fees Base USD/mo`, `Stripe Fees Stress USD/mo`, `Replit Infra Base USD/mo`, `Vercel + Neon Prod USD/mo`, `Other Ops Reserve USD/mo`, `Contribution Profit Base USD/mo`, `Contribution Profit Stress USD/mo`, `Base Margin`, `Base Profit CAD/mo`, `Est DB Storage Year 1 GB`, `Scale Recommendation`

### `Bags-Bags View.csv`

- Exported records: 6
- Exported columns: 59
- Columns already mentioned in current documentation corpus by exact-name search: 49
- Columns not found by exact-name search in current docs: 10

  - `Flow Time Low`
  - `Flow Time High`
  - `Grind Adjustment Frequency`
  - `Yield Low`
  - `Generate 🧠 Bag Intelligence Dossier`
  - `Intelligence Reviewed`
  - `Intelligence Generated Date`
  - `🧠 Bag Intelligence Dossier`
  - `🏛️ Historical Significance`
  - `⭐ Final Verdict`

Fields exported:

`Bag ID`, `Bag Label`, `Beans`, `Active`, `Go To Coffee`, `Roast Level ( ChatGPT )`, `Days off Roast at Open`, `Roast Date Used`, `Bag Purchased Date`, `Expiry Label`, `Expiry Precision`, `Estimated Roast Window`, `Actual Roast Date`, `Estimated Expiry Date`, `Estimated Roast Date`, `Freshness Dating Method`, `Roast Date Confidence`, `Roast Date Notes`, `Opened Date`, `End Date`, `Days Drank From`, `Status`, `Notes`, `Bag Notes`, `Bag Size (g)`, `Bag Cost`, `Cost per Gram`, `Shot Count`, `Shots`, `Avg Rating`, `Average  Preference Rating`, `Reference Shots`, `Reference Shot %`, `Daily Driver Count`, `Pour Time Window`, `Flow Time Low`, `Flow Time High`, `Flow Time Window`, `Pour Delay Window`, `Yield Window`, `Ratio Window`, `Target Dose (g)`, `Bag Behaviour Review`, `Reference Shots (filtered)`, `Initial Grinder Setting`, `Average Grinder Setting`, `Total Grind Adjustments`, `Days Bag Active`, `Days per Grind Adjustment`, `Grind Adjustment Frequency`, `Yield Low`, `Analysis Shot Count`, `Signature Shot Count`, `Generate 🧠 Bag Intelligence Dossier`, `Intelligence Reviewed`, `Intelligence Generated Date`, `🧠 Bag Intelligence Dossier`, `🏛️ Historical Significance`, `⭐ Final Verdict`

### `Beans-Beans View.csv`

- Exported records: 6
- Exported columns: 30
- Columns already mentioned in current documentation corpus by exact-name search: 29
- Columns not found by exact-name search in current docs: 1

  - `Region`

Fields exported:

`Beans`, `Roaster`, `Name`, `Region`, `Country`, `Certification`, `Process`, `Active`, `Notes`, `Bag`, `Total Bags Purchased`, `Total Shots`, `Total Reference Shots`, `Avg Rating`, `Avg Bean Preference Rating`, `Grind Adj Frequency`, `Typical Pour Delay Window`, `Typical Pour Time Window`, `Typical Flow Time Window`, `Typical Yield Window`, `Typical Ratio Window`, `Avg Initial Grinder Setting`, `Average Grinder Setting`, `Total Grind Adjustments`, `Initial Grind Time (sec)`, `Bean Reference Shot %`, `Daily Driver Count`, `Daily Driver %`, `Analysis Shot Count`, `Signature Shot Count Rollup (from Bag)`

### `Grinder Jam Events-Grid view.csv`

- Exported records: 5
- Exported columns: 14
- Columns already mentioned in current documentation corpus by exact-name search: 2
- Columns not found by exact-name search in current docs: 12

  - `Jam Event`
  - `Date / Time`
  - `Hopper Fullness Before Event`
  - `Hopper Context`
  - `Motor Response`
  - `Recovery Method`
  - `Cleanout Performed`
  - `Purge / Loss (g)`
  - `Recurrence Cluster`
  - `Related Shot`
  - `Evidence Confidence`
  - `Hopper Cycle`

Fields exported:

`Jam Event`, `Date / Time`, `Hopper Fullness Before Event`, `Hopper Context`, `Grinder Setting`, `Motor Response`, `Recovery Method`, `Cleanout Performed`, `Purge / Loss (g)`, `Recurrence Cluster`, `Related Shot`, `Evidence Confidence`, `Notes`, `Hopper Cycle`

### `Hopper Range Baselines-Hopper Range Baselines.csv`

- Exported records: 5
- Exported columns: 7
- Columns already mentioned in current documentation corpus by exact-name search: 7
- Exact-name documentation coverage: complete by simple search.

Fields exported:

`Hopper Range`, `Baseline Output Adjusted Date`, `Baseline Output Status`, `Baseline Output (g)`, `Avg Initial Output (g)`, `Count`, `Shots`

### `Hopper-Hopper View.csv`

- Exported records: 17
- Exported columns: 9
- Columns already mentioned in current documentation corpus by exact-name search: 8
- Columns not found by exact-name search in current docs: 1

  - `Grinder Jam Events`

Fields exported:

`Name`, `Starting Beans (g)`, `Shots`, `Active`, `Hopper Mass (g)`, `Hopper %`, `Shots Left (estimated)`, `Notes`, `Grinder Jam Events`

### `Project Notes-Project Notes View.csv`

- Exported records: 20
- Exported columns: 11
- Columns already mentioned in current documentation corpus by exact-name search: 11
- Exact-name documentation coverage: complete by simple search.

Fields exported:

`Date`, `Title`, `Summary`, `Key Finding`, `Trigger / Condition`, `Action Taken`, `Outcome`, `Category`, `Confidence`, `Applies To Future Bags`, `Notes`

### `Shot Fault Rules-Shot Fault Rules.csv`

- Exported records: 12
- Exported columns: 3
- Columns already mentioned in current documentation corpus by exact-name search: 3
- Exact-name documentation coverage: complete by simple search.

Fields exported:

`Criteria`, `Fault Status`, `Notes`

### `Shots-Shots Entering.csv`

- Exported records: 235
- Exported columns: 93
- Columns already mentioned in current documentation corpus by exact-name search: 90
- Columns not found by exact-name search in current docs: 3

  - `Hopper Range Match`
  - `Initial Output vs Target Dose (g)`
  - `Initial Output vs Hopper Baseline (g)`

Fields exported:

`Date`, `Bag`, `Days Since Open`, `Shots Left (est)`, `Grinder Setting`, `Grind Adjusted`, `Grind Time`, `Initial Output (g)`, `Total Output (g)`, `Dose (g)`, `Time Adj (sec)`, `Top-Up Grind (g)`, `Over Grind Removed (g)`, `Bean Delta`, `Grind Waste (g)`, `Beans Added (g)`, `Dose Correction Type`, `Correction Amount (g)`, `Output Delta (g)`, `Temp`, `Pour Delay`, `Pour Time (sec)`, `Flow Time (sec)`, `Yield (g)`, `Ratio`, `Finished Shot`, `Rating`, `Preference Rating`, `Rating Difference`, `Average Rating and Preference Rating weighted to Preference`, `Rated`, `Sour`, `For Others`, `Reference Shot`, `Signature Shot`, `Boundary Shot`, `Drink Type`, `Shot Status`, `Shot Classification`, `Fault Status`, `Bean Achievement`, `Expression Style`, `Daily Driver Count`, `Include in Analysis`, `Important to Intelligence`, `Intelligence Lesson Type`, `Notes`, `Rating ( Valid Only )`, `Fault Notes`, `Bag Opened Date`, `Hopper Phase`, `Hopper Fullness`, `Hopper %`, `Hopper Range`, `Hopper Range Link`, `Hopper Range Match`, `Hopper Link`, `Taste Zone`, `Zone`, `Zone Score`, `Taste Score`, `Agreement %`, `Flow Score`, `Model Flag`, `Time Gap (sec)`, `Flow Diagnostic`, `Pour Delay Window`, `Flow Time Window`, `Yield Window`, `Ratio Window`, `Drift Delta (sec)`, `Shot Drift Status`, `Shot Quality Score`, `Shot Tier`, `Perfect Range Flag`, `Drift Warning`, `Hopper Zone`, `Hopper Drift Link`, `Hopper Impact Score`, `Hopper Correction Rule`, `Action Suggestion`, `Scale Calibration Reminder`, `Bag Calibration Reminder`, `Calculation`, `Baseline Unaided Output (g)`, `Initial Output vs Target Dose (g)`, `Initial Output vs Hopper Baseline (g)`, `Hopper Threshold Flag`, `Hopper Behaviour`, `Hopper Severity`, `Top-Up Gap (g)`, `Top-Up Recommendation`, `Grinder Initial Output for Charts (16-19g)`

## Cross-export observations

### New or notable exported tables

- `BSE Launch Economics-Grid view.csv` is present and supports product/pricing planning evidence.
- `Grinder Jam Events-Grid view.csv` is present and should be considered for future reliability, model-exception, and hopper-mechanics documentation.
- `Beans-Beans View.csv` and `Hopper-Hopper View.csv` use view names that differ from earlier fixture names, but the tables are recognizable.

### Full Shots export correction

- `Shots-Shots Entering.csv` now has 235 records and 93 columns.
- The earlier 19-record copy was a filtered/current-month export and is superseded by the corrected file.
- The corrected full export does not include `Bag Label`, while an earlier CI fixture did. The user clarified that `Bag Label` is a view/data-entry helper that shows the current bag during selection. It is not required as canonical Shot evidence when the `Bag` relationship/export value is present.

### Row-count drift versus earlier documented/fixture expectations

- `Shots-Shots Entering.csv` has 235 records; earlier CI fixture coverage used a 164-record export named `Shots-Shots Entering-7.csv`. This indicates the offline complete-base export is newer or broader than the committed CI fixture.
- `Bags-Bags View.csv` has 6 records; earlier documentation referenced 5 records.
- `Beans-Beans View.csv` has 6 records; earlier documentation referenced 5 records.
- `Hopper-Hopper View.csv` has 17 records; earlier fixture coverage used 12 hopper records.
- `Project Notes-Project Notes View.csv` has 20 records; earlier documentation referenced 19 records.
- `10-Point Rating System-Rating Systems.csv` contains 39 rows, 34 of which are non-empty. Blank or section-separator rows may explain differences with earlier counts.

### Current date and unentered coffees

The user stated there are coffees to add from August 17, 2026. This audit does not add those records and does not infer their values from the export. They should be entered through the approved Coffee Log shot-entry/import workflow after the user provides the shot details or an updated export.

## Verification status

| Verification area | Status | Notes |
|---|---|---|
| CSV files readable | Pass | 10 CSV files parsed successfully |
| Row/column counts captured | Pass | Recorded in export inventory |
| Checksums captured | Pass | SHA-256 recorded for each export |
| Full Shots export | Pass | 235 records, 93 columns |
| Bag Label treatment | Documented | View/data-entry helper; not canonical when `Bag` is present |
| Field-name evidence captured | Pass | Headers listed per table |
| Documentation exact-name comparison | Partial | Simple exact-name search only; does not prove semantic mapping |
| Airtable field types | Blocked | CSV exports do not expose field configuration |
| Airtable formulas | Blocked | CSV exports expose outputs, not formula definitions |
| Hidden fields/views | Blocked | CSV exports expose only selected view columns |
| Linked-record cardinality | Partial | Labels are visible, Airtable metadata is not |
| August 17, 2026 new coffees | Not started | Separate entry/import task required |

## Required follow-up

1. Decide whether the 235-record Shots export should replace or supplement the committed 164-record CI fixture.
2. Export any missing linked-record tables if relationships reference tables not included in this package.
3. Create an evidence manifest with export date, source view, row count, column count, checksum, and privacy status.
4. Decide whether `BSE Launch Economics` and `Grinder Jam Events` should be added to the formal field inventory.
5. Use an updated CSV export or explicit shot details to add August 17, 2026 coffees in a separate approved task.
6. When Airtable API limits reset, run live metadata verification to recover field types, formulas, hidden fields, and linked-record cardinality.

## Certification impact

This export reduces the Airtable blocker from “no current evidence available” to “offline complete visible CSV evidence available.” It does not fully close live Airtable verification because metadata and formula definitions remain unavailable from CSV alone.
