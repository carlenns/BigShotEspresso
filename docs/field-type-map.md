# BigShotEspresso Field Type and Access Map

The complete per-field inventory is in `csv-data-dictionary.md`. This map defines presentation and access policy for every field group.

## Editable logging fields

### Shots — Quick Log candidates

Date, Dose (g), Yield (g), Flow Time (sec), Rating, Pour Delay, Pour Time (sec), Temp, Grinder Setting, Grind Time, Initial Output (g), Grind Adjusted.

Quick Log visibility is preference-controlled. Dose is the actual basket dose; Initial Output is grinder output before correction.

### Shots — Full Log inputs

All Quick Log fields plus Total Output (g), Time Adj (sec), Top-Up Grind (g), Over Grind Removed (g), Grind Waste (g), Beans Added (g), Dose Correction Type, Correction Amount (g), Finished Shot, Preference Rating, Rated, Sour, For Others, Reference Shot, Signature Shot, Boundary Shot, Drink Type, Shot Status, Shot Classification, Fault Status, Bean Achievement, Expression Style, Important to Intelligence, Intelligence Lesson Type, Notes, Fault Notes, and Taste Zone if Airtable metadata confirms it is manually editable.

Control policy:

- Single selects use dropdowns.
- Multi-selects use ordered chip selectors.
- Flags use checkboxes.
- Notes and Fault Notes use free text.
- Signature Shot implies Reference Shot.
- No rating may imply Reference or Signature status.

### Bags

Beans, Active, Go To Coffee, Roast Level, Bag Purchased Date, Expiry Label, Expiry Precision, Actual Roast Date, Freshness Dating Method, Roast Date Confidence, Roast Date Notes, Opened Date, End Date, Status, Notes, Bag Notes, Bag Size, Bag Cost, Target Dose, and Bag Behaviour Review.

### Beans

Beans, Roaster, Name, Country, Certification, Process, Active, and Notes.

### Hopper and baselines

Hopper: Name, Starting Beans, Active, Notes, and explicit fill/top-up/reconciliation event inputs.  
Baselines: Hopper Range, Baseline Output Adjusted Date, Baseline Output Status, and Baseline Output.

### Knowledge/reference tables

All Project Notes, Shot Fault Rules, and Rating System source fields are editable by an authorized maintainer.

## Read-only and derived fields

### Shot formulas/lookups

Bag Label; Days Since Open; Shots Left; Bean Delta; Output Delta; Ratio; Rating Difference; weighted rating; Daily Driver Count; Include in Analysis; Rating (Valid Only); Bag Opened Date; Hopper %, Hopper Range/Range Link/Hopper Link when assigned by workflow; Zone; Zone Score; Taste Score; Agreement %; Flow Score; Model Flag; Time Gap; Scale Zone; Flow Diagnostic; Pour Delay Window; Flow Time Window; Flow Time Offset; Drift Delta; Shot Drift Status; Shot Quality Score; Shot Tier; Perfect Range Flag; Drift Warning; Hopper Zone; Hopper Drift Link; Hopper Impact Score; Hopper Correction Rule; Action Suggestion; calibration reminders; Calculation; Baseline Unaided Output; Baseline Output Delta; Actual Dose Error; Hopper Threshold Flag; Hopper Behaviour; Hopper Severity; Top-Up Gap; Top-Up Recommendation; chart helper.

### Bag rollups/formulas

Bag Label; Days off Roast at Open; Roast Date Used; Estimated Roast Window; Estimated Expiry Date; Estimated Roast Date; Days Drank From; Cost per Gram; Shot Count; Reference Shots; Shots; rating/preference averages; timing/ratio windows; Reference Shots filtered; Reference Shot %; Daily Driver Count; initial/average grind settings; Total Grind Adjustments; Days Bag Active; Days per Grind Adjustment; Analysis Shot Count; Signature Shot Count.

### Bean rollups/formulas

Bag relationship; all totals, averages, percentages, timing/yield/ratio windows, grind summaries, Analysis Shot Count, Daily Driver metrics, and Signature Shot rollup.

### Hopper rollups/formulas

Shots relationship display, Hopper Mass, Hopper %, Shots Left, observed average baseline output, baseline count, and baseline shot links.

## Visibility classification

### Logging only

Raw operational capture that should not dominate dashboards: Total Output, Time Adj, Top-Up Grind, Over Grind Removed, Grind Waste, Beans Added, correction type/amount, Finished Shot, Rated, For Others, Fault Notes.

### Dashboard only

Reference windows, bag progress, bag lifecycle summaries, DCI/OSI/HMI summaries, Current Shot vs Reference, grind drift, confidence, and action/watchlist outputs.

### Intelligence only

Include in Analysis, valid-only rating, model/taste scores, Agreement %, Flow Score, Model Flag, offsets, quality/tier/drift helpers, hopper impact/threshold/behavior/severity, baseline deltas, dose error, Top-Up Gap, and chart helpers.

### Hidden helpers

Calculation, chart-normalized Initial Output, record identifiers, raw imported rows, formula helper scores, and internal linked-record IDs. Hidden does not mean discard; these fields remain auditable.

### Read-only but visible where useful

Ratio, Days Since Open, Bag Opened Date, Flow Diagnostic, Action Suggestion, Shot Tier, Hopper Range/Zone, baseline comparison, and confidence labels.

## Intelligence dependency map

| Engine | Primary fields |
|---|---|
| DCI | Grind Time, Initial Output, Total Output, target/actual Dose, correction fields, Actual Dose Error, hopper state, bag age. |
| OSI | Initial Output, actual Dose, Dose Variance, Yield and target window, weighed historical outcomes, no-weigh simulation. |
| GSP | Bag, setting, dose, yield, temperature, timing metrics, ratings, reference flags, analysis gate. |
| MSI | Mechanical metrics, Taste Zone, model Zone, scores, Agreement, Model Flag, intelligence flags/lessons, notes. |
| BLI | Bag dates/age, active state, phase, ratings, references, signatures, grind drift, lifecycle windows. |
| HMI | Hopper ledger/state, fullness/range, Initial Output, baseline output, corrections, behavior/severity, top-up frequency. |

## Current application control mismatches

- Fault Status is presented as a single dropdown but CSV records contain multiple values.
- Shot Classification is absent from current Full Log and Quick Log despite being a multi-select source field.
- Several editable flags and intelligence fields are absent from forms.
- Many read-only intelligence outputs are not typed or visible.
- The separate local Taste Selectors vocabulary is not equivalent to the authoritative Airtable fields and must not replace them.
- Current Quick Log labels historical `scaleTime` as “Shot Time”; the current canonical domain term is Flow Time.
