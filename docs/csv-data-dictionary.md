# BigShotEspresso CSV Data Dictionary

## Authority and notation

This dictionary is derived from the current CSV exports in `/CSV Files`. The current Shots export (`Shots-Shots Entering-7.csv`, 93 fields) supersedes the older attached 87-field export. In particular, **Flow Time** is the current name for the historical **Scale Time** field.

Source priority: CSV exports → architecture/project notes → application code. Types marked **Unresolved** require Airtable metadata or formula inspection before implementation.

Edit codes: **E** user-entered, **R** read-only/derived, **L** linked-record assignment, **S** system/event-managed.  
UI codes: text, long text, number, currency, date/time, checkbox, dropdown, chips, link, or hidden.

## Shots

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Date | DateTime | E | date/time | Shot/event timestamp; ordering input for all engines. |
| Bag | Link | L | link/dropdown | Parent bag relationship; active-bag isolation for BLI/GSP/MSI/OSI. |
| Bag Label | Lookup | R | read-only | Human-readable bag label from Bags. |
| Days Since Open | Formula | R | read-only | Shot date minus bag opened date; BLI/HMI context. |
| Shots Left (est) | Formula/Number | R | read-only | Estimated remaining shots; bag/hopper progress. |
| Grinder Setting | Number | E | number | Mechanical setting; GSP, DCI, BLI, HMI. |
| Grind Adjusted | Checkbox | E | checkbox | Marks a setting change; GSP and drift analysis. |
| Grind Time | Number | E | number | Timed-dose duration; core DCI/OSI input. |
| Initial Output (g) | Number | E | number | Grinder output before basket correction (app label: `Initial Grinder Output`); not the final basket dose. Core DCI/OSI/HMI input. |
| Total Output (g) | Number | E | number | Output after top-up/trim, before basket normalization; DCI/HMI. |
| Dose (g) | Number | E | number | Final dose that ends up in the basket after any top-up/trim (app label: `Target / Basket Dose`); actual basket dose used for extraction; OSI/DCI/GSP. |
| Time Adj (sec) | Number | E | number | Additional/subtracted grind time used for a top-up correction (app label: `Top-Up Time Adj`); DCI/HMI. If left blank during an under-dose top-up, the app falls back to the grinder minimum time setting or 0.2s. |
| Top-Up Grind (g) | Number | E | number | Extra grounds added after under-dose (app label: `Top-Up Grind Added`) — the incremental grams added, not the final basket dose; DCI/HMI/OSI. |
| Over Grind Removed (g) | Number | E | number | Grounds removed from the basket to reach target dose after over-dose; DCI/HMI/OSI. |
| Bean Delta | Formula/Ledger | R | read-only | Inventory change caused by shot/event; Hopper state workflow. |
| Grind Waste (g) | Number | E | number | Purge/setup/grind-change waste, entered separately from any dose correction; not part of the basket dose. Counts against bag/hopper remaining; Hopper ledger and operational cost. |
| Beans Added (g) | Number | E | number | Hopper fill/top-up event amount; Hopper state workflow/HMI. |
| Dose Correction Type | Single Select | E | dropdown | `Over → Trim` or `Under → Top-Up`, derived from Initial Output vs. Dose; DCI/HMI/OSI. |
| Correction Amount (g) | Number | E | number | Magnitude of dose correction; DCI/HMI/OSI. |
| Output Delta (g) | Formula | R | read-only | Difference between expected and produced output; DCI/HMI. |
| Temp | Number | E | number | Brew temperature; GSP/MSI and reference comparisons. |
| Pour Delay | Number | E | number | Pump start to first visible coffee; GSP/MSI. |
| Pour Time (sec) | Number | E | number | Pump start to pump stop; GSP/MSI. |
| Flow Time (sec) | Number | E | number | Active scale-detected coffee-flow duration; formerly Scale Time; GSP/MSI. |
| Yield (g) | Number | E | number | Beverage output; GSP/OSI and target windows. |
| Ratio | Formula | R | read-only | Yield divided by actual basket dose; GSP/MSI. |
| Finished Shot | Checkbox | E | checkbox | Whether the beverage was completed/consumed (displayed as `Did Not Finish` context when false). Recorded as context only; does not automatically change Include in Analysis or any other selector. |
| Rating | Number | E | rating | Technical/overall score; GSP/BLI/MSI. |
| Preference Rating | Number | E | rating | Personal enjoyment score; GSP/BLI/MSI. |
| Rating Difference | Formula | R | read-only | Difference between rating dimensions; MSI. |
| Average Rating and Preference Rating weighted to Preference | Formula | R | read-only | Preference-weighted composite; BLI/GSP, formula unresolved. |
| Rated | Checkbox | E | checkbox | Personal rating participation flag. `Not Rated` shots remain preserved as records but are excluded from rating/preference statistics and rating-driven insights. `Not Rated` is related to but distinct from `Include in Analysis`: `Not Rated` controls rating/statistical participation, while `Include in Analysis` is the separate scientific/process eligibility gate (Shot Status `Good`/`Dialed In` plus Fault Status `Good`). |
| Sour | Checkbox | E | checkbox | Manual sensory marker; MSI/GSP. |
| For Others | Checkbox | E | checkbox | Guest/non-owner consumption context. In app entry, selecting this defaults the shot to `Not Rated` unless the user explicitly chooses to rate it. |
| Reference Shot | Checkbox | E | checkbox | Manual benchmark; GSP/BLI/reference comparison. Never infer from rating. |
| Signature Shot | Checkbox | E | checkbox | Manual exceptional-shot flag; implies Reference Shot. |
| Boundary Shot | Checkbox | E | checkbox | Manual edge/boundary case; MSI and model calibration. |
| Drink Type | Single Select | E | dropdown | Beverage preparation classification. Curated list (includes Affogato) plus user-added custom drink types from Defaults & Settings, stored as free text so existing values are never rejected. New shots pre-fill from the single user-level `Default Drink Type` in Settings; changing `Drink Type` never automatically changes `Rated`/`Not Rated`, `Include in Analysis`, `Shot Status`, `Fault Status`, or `Brew Method`. Machine/profile-level drink type defaults (e.g. a specific machine+grinder setup implying a drink type) are deferred until shots can explicitly select a machine/grinder/setup profile and until users/OAuth exist. |
| Brew Method | Single Select | E | dropdown | How the beverage was extracted (Espresso, Pour-over, AeroPress, French Press, Moka Pot) — independent of `Drink Type` (what was served, e.g. Americano). Curated list matches the existing `Default Brew Method` options in Settings exactly; no additional values invented. New shots prefer the selected Machine's own `Brew Method` (from Equipment) when clearly available, else fall back to the user-level `Default Brew Method` in Settings; never overwrites a value already set. Changing `Brew Method` never automatically changes `Drink Type`, and vice versa. Every shot logged before this field existed was backfilled to `Espresso` — the only brew method evidenced anywhere in the historical dataset — without overwriting any value already present. |
| Shot Status | Single Select | E | dropdown | Operational record state; analysis eligibility context. |
| Shot Classification | Multi Select historically; curated as single-choice workflow type in app | E | dropdown | Record/workflow type such as Good Shot, Dial-In Shot, grinder event, new bag entry, hopper refill, maintenance, experiment, or sink shot. Not the authority for reference/signature/daily-driver status. |
| Fault Status | Multi Select historically; curated as single-choice analysis condition in app | E | dropdown | Analytical cleanliness/fault reason. `Good` is required with Shot Status `Good` or `Dialed In` for Include in Analysis. Other values explain why a record is excluded or exceptional. |
| Bean Achievement | Multi Select historically; curated as single-choice achievement in app | E | dropdown | Personal/bean achievement such as Daily Driver, Best of Bag, Guest Worthy, Personal Best, or Sweet Spot Found; BLI and highlights. `Daily Driver` means the user would want this coffee/expression as an everyday drink, not merely that it was technically good. |
| Expression Style | Multi Select | E | chips | Overall sensory experience; first value is primary highlight. |
| Daily Driver Count | Formula | R | read-only | Derived marker/count for Daily Driver achievement; BLI. |
| Include in Analysis | Formula/Checkbox | R | read-only | Authoritative gate for every analytical query. |
| Important to Intelligence | Checkbox | E | checkbox | Marks a lesson-bearing shot, not a quality award; MSI/model governance. |
| Intelligence Lesson Type | Multi Select | E | chips | Lesson categories such as Model Exception/Flow Diagnostic; MSI. |
| Notes | Long Text | E | long text | Free-form contextual/sensory detail; not selector authority. |
| Rating ( Valid Only ) | Formula | R | read-only | Rating filtered by analysis validity. |
| Fault Notes | Long Text | E | long text | Free-form mechanical/fault explanation. |
| Bag Opened Date | Lookup/Date | R | read-only | Bag open date propagated to shot; BLI. |
| Hopper Phase | Single Select | S | dropdown/read-only | State phase assigned by Hopper workflow; HMI/BLI. |
| Hopper Fullness | Number/Percent | S | percent | Hopper fullness at shot time; HMI/DCI/OSI. |
| Hopper % | Formula/Percent | R | read-only | Hopper ledger percentage/change value; exact formula unresolved. |
| Hopper Range | Single Select | R | read-only | Fullness bucket; HMI baseline grouping. |
| Hopper Range Link | Link/Lookup | R | read-only link | Link to Hopper Range Baseline record. |
| Hopper Link | Link | L | read-only link | Shot assignment to Hopper state record. |
| Taste Zone | Single Select | E/Unresolved | dropdown | Sensory zone: Center/Edge/Outside; MSI. Edit authority needs Airtable metadata. |
| Zone | Formula/Single Select | R | read-only | Model-predicted zone; MSI. |
| Zone Score | Formula | R | read-only | Numeric score for model zone; MSI. |
| Taste Score | Formula | R | read-only | Numeric score for Taste Zone; MSI. |
| Agreement % | Formula/Percent | R | read-only | Agreement between model and sensory result; MSI. |
| Flow Score | Formula/Percent | R | read-only | Score based on timing offset; GSP/MSI/HMI. |
| Model Flag | Formula/Single Select | R | read-only | Match/Mismatch result; MSI. |
| Time Gap (sec) | Formula | R | read-only | Difference between timing measures; GSP/MSI. |
| Scale Zone | Formula/Single Select | R | read-only | Historical label for flow-timing zone; rename review required. |
| Flow Diagnostic | Formula/Single Select | R | read-only | Fast/Normal/Slow diagnostic; required dashboard intelligence. |
| Pour Delay Window | Lookup/Text | R | read-only | Bag reference window for first pour. |
| Flow Time Window | Lookup/Text | R | read-only | Bag reference window for active flow time. |
| Flow Time Offset (Scale) | Formula | R | read-only | Deviation from flow-time reference; historical “Scale Offset.” |
| Drift Delta (sec) | Formula | R | read-only | Timing drift magnitude; GSP/MSI. |
| Shot Drift Status | Formula/Single Select | R | read-only | Finer/coarser/watch/stable recommendation. |
| Shot Quality Score | Formula/Percent | R | read-only | Composite flow/agreement/rating score; formula documented in Project Notes. |
| Shot Tier | Formula/Single Select | R | read-only | Elite/Great/Good/Edge/Outside from quality score. |
| Perfect Range Flag | Formula | R | read-only | Target-range marker. |
| Drift Warning | Formula/Single Select | R | read-only | Stable/Watch/Drifting output. |
| Hopper Zone | Formula/Single Select | R | read-only | Human-readable hopper level bucket; HMI. |
| Hopper Drift Link | Formula/Lookup | R | read-only | Indicates likely hopper effect versus other factors; HMI/MSI. |
| Hopper Impact Score | Formula | R | read-only | Hopper-weighted timing offset; HMI. |
| Hopper Correction Rule | Formula/Text | R | read-only | Contextual hopper correction guidance; HMI/OSI. |
| Action Suggestion | Formula/Single Select | R | read-only | Grind finer/coarser/no change/manual review. |
| Scale Calibration Reminder | Formula | R | read-only | Historical flow-window calibration reminder. |
| Bag Calibration Reminder | Formula | R | read-only | Bag threshold/window calibration reminder. |
| Calculation | Formula | R | hidden/read-only | Sweet Zone/Outside helper output; purpose needs formula confirmation. |
| Baseline Unaided Output (g) | Lookup | R | read-only | Expected initial output for hopper range; HMI/DCI/OSI. |
| Baseline Output Delta (g) | Formula | R | read-only | Initial output minus hopper baseline; HMI/DCI. |
| Actual Dose Error (g) | Formula | R | read-only | Actual basket dose minus target dose; DCI/OSI. |
| Hopper Threshold Flag | Formula/Single Select | R | read-only | Normal/Moderate Drop/Severe Drop; HMI. |
| Hopper Behaviour | Formula/Single Select | R | read-only | Range plus stable/drop classification; HMI. |
| Hopper Severity | Formula/Single Select | R | read-only | Stable/Moderate/Severe; HMI. |
| Top-Up Gap (g) | Formula | R | read-only | Expected grounds needed to reach target dose; HMI/DCI/OSI. |
| Top-Up Recommendation | Formula/Text | R | read-only | Recommended timed top-up; HMI/OSI. |
| Grinder Initial Output for Charts (16-19g) | Formula | R | removed | **Removed 2026-08-25** (migration `0009_remove_grinder_initial_output_for_charts`). Was a personal Airtable chart-range helper only (narrowed the y-axis for grinder output's typical ~2g spread) — a pure display formula of `Initial Output (g)`, never an independent input. Dropped from the Postgres schema; `Initial Output (g)` (`initialGrindWeight`) remains the canonical field and is unaffected. |

## Bags

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Bag ID | Number/Primary | S | read-only | Stable bag identifier used by Shots and Beans. |
| Bag Label | Formula/Text | R | read-only | Human-readable bag display label. |
| Beans | Link | L | link/dropdown | Parent Bean relationship. |
| Active | Checkbox | E | checkbox | Selects current bag; primary dashboard scope. |
| Go To Coffee | Checkbox | E | checkbox | Preferred/default coffee marker; behavior unresolved. |
| Roast Level ( ChatGPT ) | Single Select/Text | E | dropdown | Roast classification; GSP/BLI. |
| Days off Roast at Open | Formula | R | read-only | Freshness at opening; BLI. |
| Roast Date Used | Formula/Date | R | read-only | Effective roast date selected from available evidence. |
| Bag Purchased Date | DateTime | E | date/time | Purchase chronology and freshness inference. |
| Expiry Label | Text | E | text | Printed expiry information. |
| Expiry Precision | Single Select | E | dropdown | Precision of expiry label. |
| Estimated Roast Window | Formula/Text | R | read-only | Derived possible roast range. |
| Actual Roast Date | Date | E | date | Known roast date when available. |
| Estimated Expiry Date | Formula/Date | R | read-only | Normalized expiry date. |
| Estimated Roast Date | Formula/Date | R | read-only | Inferred roast date. |
| Freshness Dating Method | Single Select | E | dropdown | Method used to establish roast date. |
| Roast Date Confidence | Single Select | E | dropdown | Confidence in freshness estimate. |
| Roast Date Notes | Long Text | E | long text | Evidence and assumptions behind dates. |
| Opened Date | Date | E | date | Start of bag lifecycle; BLI/HMI. |
| End Date | Date | E/S | date | End of bag lifecycle. |
| Days Drank From | Formula | R | read-only | Bag duration; BLI. |
| Status | Single Select | E | dropdown | Active/Finished state. |
| Notes | Long Text | E | long text | Bean-provided/general notes. |
| Bag Notes | Long Text | E | long text | Bag-specific dial-in and lifecycle observations. |
| Bag Size (g) | Number | E | number | Starting inventory; BLI/Hopper ledger. |
| Bag Cost | Currency | E | currency | Purchase cost. |
| Cost per Gram | Formula/Currency | R | read-only | Bag cost divided by bag size. |
| Shot Count | Rollup | R | read-only | Child Shots count; operational history. |
| Reference Shots | Rollup | R | read-only | Reference child-shot count. |
| Shots | Link/Rollup | R | read-only link | Child Shot relationship. |
| Avg Rating | Rollup | R | read-only | Average eligible rating; BLI. |
| Average  Preference Rating | Rollup | R | read-only | Average eligible preference; BLI. |
| Pour Delay Window | Rollup/Formula | R | read-only | Bag-specific first-pour min/center/max. |
| Pour Time Window | Rollup/Formula | R | read-only | Bag-specific pump-time window. |
| Flow Time | Rollup/Formula | R | read-only | Bag-specific active-flow window. |
| Ratio Window | Rollup/Formula | R | read-only | Bag-specific ratio window. |
| Target Dose (g) | Number | E | number | Desired basket dose; DCI/OSI. |
| Bag Behaviour Review | Long Text | E | long text | End-of-bag interpretation; BLI. |
| Reference Shots (filtered) | Rollup | R | read-only | Reference-shot values used for windows. |
| Reference Shot % | Formula/Percent | R | read-only | References divided by analysis shots; BLI. |
| Daily Driver Count | Rollup | R | read-only | Count of Daily Driver achievements. |
| Initial Grinder Setting | Rollup/Lookup | R | read-only | First setting used for bag; GSP/BLI. |
| Average Grinder Setting | Rollup | R | read-only | Average setting; GSP/BLI. |
| Total Grind Adjustments | Rollup/Formula | R | read-only | Number of changes; GSP/BLI. |
| Days Bag Active | Formula | R | read-only | Current/end date minus opened date; BLI. |
| Days per Grind Adjustment | Formula | R | read-only | Adjustment frequency; GSP/BLI. |
| Analysis Shot Count | Rollup | R | read-only | Count gated by Include in Analysis. |
| Signature Shot Count | Rollup | R | read-only | Manual Signature Shot count; BLI. |

## Beans

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Beans | Primary Text | E | text | Canonical bean/coffee display name. |
| Roaster | Text/Link | E | text | Roaster identity. |
| Name | Text | E | text | Optional product name; currently empty. |
| Country | Text/Single Select | E | text/dropdown | Origin country; future GSP/community input. |
| Certification | Multi Select | E | chips | Certifications. |
| Process | Single/Multi Select | E | dropdown/chips | Processing method; GSP/BLI. |
| Active | Checkbox | E | checkbox | Current bean marker. |
| Notes | Long Text | E | long text | Producer/roaster flavor notes. |
| Bag | Link | R | read-only link | Child Bags relationship. |
| Total Bags Purchased | Rollup | R | read-only | Bag count; buying intelligence. |
| Total Shots | Rollup | R | read-only | Child shot count. |
| Total Reference Shots | Rollup | R | read-only | Reference count. |
| Avg Rating | Rollup | R | read-only | Cross-bag rating average; BLI/GSP. |
| Avg Bean Preference Rating | Rollup | R | read-only | Cross-bag preference average. |
| Grind Adj Frequency | Formula/Percent | R | read-only | Adjustment count per shots; GSP. |
| Typical Pour Delay Window | Rollup/Formula | R | read-only | Cross-bag first-pour window. |
| Typical Pour Time Window | Rollup/Formula | R | read-only | Cross-bag pump-time window. |
| Typical Flow Time Window | Rollup/Formula | R | read-only | Cross-bag active-flow window. |
| Typical Yield Window | Rollup/Formula | R | read-only | Cross-bag yield window. |
| Typical Ratio Window | Rollup/Formula | R | read-only | Cross-bag ratio window. |
| Avg Initial Grinder Setting | Rollup | R | read-only | Average bag starting setting; GSP. |
| Average Grinder Setting | Rollup | R | read-only | Cross-bag setting average; GSP. |
| Total Grind Adjustments | Rollup | R | read-only | Cross-bag adjustment count. |
| Initial Grind Time (sec) | Rollup/Lookup | R | read-only | Typical timed-dose starting duration; DCI/OSI. |
| Bean Reference Shot % | Formula/Percent | R | read-only | References divided by analysis shots. |
| Daily Driver Count | Rollup | R | read-only | Cross-bag Daily Driver count. |
| Daily Driver % | Formula/Percent | R | read-only | Daily Driver share of eligible shots. |
| Analysis Shot Count | Rollup | R | read-only | Include-in-Analysis-gated count. |
| Signature Shot Count Rollup (from Bag) | Rollup | R | read-only | Signature count across Bags. |

## Hopper

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Name | Primary Text | S/E | text | Hopper state/phase record identifier. |
| Starting Beans (g) | Number | E | number | Mass at state start/fill; Hopper ledger/HMI. |
| Shots | Link | L/R | link | Shots assigned to this hopper state. |
| Active | Checkbox | S/E | checkbox | Current hopper state marker. |
| Hopper Mass (g) | Formula/Rollup | R | read-only | Remaining mass after shot/event deltas. |
| Hopper % | Formula/Percent | R | read-only | Current mass relative to capacity/start basis; exact denominator unresolved. |
| Shots Left (estimated) | Formula | R | read-only | Remaining mass divided by dose estimate. |
| Notes | Long Text | E | long text | Fill, phase, reconciliation, or state-transition context. |

## Hopper Range Baselines

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Hopper Range | Primary/Single Select | S/E | dropdown | Range key linked from Shots. |
| Baseline Output Adjusted Date | Date | E | date | Date baseline changed. |
| Baseline Output Status | Single Select | E | dropdown | Initial/Provisional/Adjusted maturity state. |
| Baseline Output (g) | Number | E | number | Expected unaided output for range; HMI/DCI/OSI. |
| Avg Initial Output (g) | Rollup | R | read-only | Observed average Initial Output for linked shots. |
| Count | Rollup | R | read-only | Supporting observation count/confidence. |
| Shots | Link/Rollup | R | read-only link | Shots assigned to range baseline. |

## Project Notes

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Date | DateTime | E | date/time | Governance/history timestamp. |
| Title | Text | E | text | Named learning or decision. |
| Summary | Long Text | E | long text | Concise context. |
| Key Finding | Long Text | E | long text | Reusable conclusion. |
| Trigger / Condition | Long Text | E | long text | Evidence or event that prompted note. |
| Action Taken | Long Text | E | long text | Resulting workflow/model action. |
| Outcome | Long Text | E | long text | Observed result or future rule. |
| Category | Multi Select/Text | E | chips | Knowledge classification. |
| Confidence | Single Select | E | dropdown | Evidence confidence. |
| Applies To Future Bags | Checkbox | E | checkbox | Generalization flag. |
| Notes | Long Text | E | long text | Detailed evidence/formulas/governance. |

## Shot Fault Rules

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Criteria | Text | E | text | Fault/eligibility condition. |
| Fault Status | Single/Multi Select | E | dropdown/chips | Resulting status value. |
| Notes | Long Text | E | long text | Interpretation and rule details. |

## 10-Point Rating System

| Field | Type | Edit | UI | Purpose and intelligence dependencies |
|---|---|---:|---|---|
| Section | Single Select/Text | E | dropdown/text | Rating-guide section. |
| Item | Text/Number | E | text | Score or named rule. |
| Description | Long Text | E | long text | Human interpretation of score/rule. |

## Unresolved type questions

- Exact Airtable metadata is required to settle fields marked mixed or unresolved, especially Taste Zone, Fault Rules status, Process, and formula-versus-select helper fields.
- Current CSV values prove that Fault Status, Shot Classification, Bean Achievement, Expression Style, Intelligence Lesson Type, Certification, and some Project Note categories can contain multiple values.
- `Include in Analysis` behaves as a derived final eligibility flag even though exported values resemble a checkbox.
- Historical `Reference Shot Type` is superseded by the current `Bean Achievement` field in the latest export; migration semantics must be reviewed before implementation.
