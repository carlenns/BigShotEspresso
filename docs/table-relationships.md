# BigShotEspresso Table Relationships

## Relationship map

```text
Beans
└── Bags
    ├── Shots
    └── bag-level rollups/windows

Hopper
└── Shots
    └── Hopper Range Baselines

Shots
├── Shot Fault Rules (classification/eligibility rules; no exported record link)
├── 10-Point Rating System (interpretive reference; no exported record link)
└── Project Notes (knowledge evidence; no exported record link)
```

## Confirmed linked-record relationships

| Parent | Child | Evidence | Cardinality | Key dependencies |
|---|---|---|---|---|
| Beans | Bags | `Beans.Bag`; `Bags.Beans` | One Bean to many Bags | Bean rollups aggregate Bag and Shot performance. |
| Bags | Shots | `Bags.Shots`; `Shots.Bag` and `Bag Label` | One Bag to many Shots | Active-bag analytics, reference windows, BLI, GSP, MSI, OSI. |
| Hopper | Shots | `Hopper.Shots`; `Shots.Hopper Link` | One Hopper state to many Shots | State continuity, hopper percentage, HMI. |
| Hopper Range Baselines | Shots | Baseline `Shots`; Shot `Hopper Range Link` | One range baseline to many Shots | Baseline output comparisons, HMI/DCI/OSI. |

## Lookup and rollup dependencies

### Beans

Beans receives Bag/Shot rollups for bag count, total shots, reference shots, ratings, preference, grind adjustments, timing/yield/ratio windows, analysis-shot count, Daily Driver results, and Signature Shots. These outputs must be gated by `Include in Analysis` where they describe performance rather than raw operational volume.

### Bags

Bags receives child Shot rollups for shot count, reference count, ratings, preference, reference windows, grind history, analysis count, Daily Driver, and Signature Shots. `Opened Date`, target dose, roast/freshness fields, and active state flow down to shot intelligence.

### Shots

Shots receives:

- Bag label, opened date, target/reference windows, and lifecycle context from Bags.
- Hopper state and fullness context from Hopper.
- Baseline unaided output from Hopper Range Baselines.
- Derived model, flow, drift, quality, and correction outputs from formulas.

## Hopper workflow

The Hopper table is a state-tracking ledger supporting HMI, DCI, and OSI—not a passive log.

### State lifecycle

1. **Fill event**
   - Create or activate a Hopper state.
   - Record `Starting Beans (g)` and/or a Shot event with `Beans Added (g)`.
   - Preserve the associated Bag and timestamp through Shot assignment.

2. **Top-up event**
   - Add beans without necessarily ending the active Hopper state.
   - Record `Beans Added (g)` and distinguish this from a dose correction (`Top-Up Grind (g)`), which adds grounds to the basket rather than beans to the hopper.

3. **Shot/event assignment**
   - Each Shot or operational event is linked to the Hopper state active at its timestamp.
   - `Bean Delta`, `Grind Waste (g)`, `Beans Added (g)`, and dose/output events update the ledger.
   - Maintenance, purge, refill, and reconciliation events remain in the state history even when excluded from extraction analytics.

4. **Phase transition**
   - `Hopper Phase` values observed or approved: Phase 1, Phase 2, Phase 3, End of Bag, Single Bag Phase, Custom.
   - `Grinder Cleanout` is a lifecycle/workflow event, not a Hopper Phase label.
   - A phase is a measured operating window, not necessarily the total physical beans present in the hopper.
   - When the user resets to a new phase, the newly added measurable quantity becomes the phase baseline. Unmeasured leftover beans may be intentionally ignored when the user cannot accurately count them.
   - For large bags, users commonly may use Phase 1, Phase 2, Phase 3, and End of Bag. For small bags, `Single Bag Phase` means the entire bag is treated as one tracked phase. `End of Bag` means the final leftover phase after the prior measured phases have been used, not a fixed quantity of its own.
   - A transition may create a new Hopper state or change the current state; the app must preserve explicit user phase selection and must not infer unmeasured leftover inventory.

5. **Close/reconcile**
   - End the state when the hopper is emptied, reconciled, cleaned, or superseded.
   - Reconciliation records account for retained or removed beans without treating them as valid brew shots.

### Hopper percentage

Confirmed fields are `Starting Beans (g)`, `Hopper Mass (g)`, and `Hopper %`. Going forward, hopper percentage should be based on the active measured phase baseline, not assumed whole-bag inventory.

The grinder/accessory model should include:

- `Hopper Size` or `Hopper Capacity`, describing the physical grinder hopper capacity (example: 340g).
- `Preferred Hopper Phase Fill Amount`, describing how much the user normally adds for a tracked phase (example: 300g).

Both are guidance, not hard limits. The app may warn when an actual phase's starting-beans entry exceeds the grinder's `Hopper Capacity`, but must still allow it — the actual measured Phase Starting Beans value the user enters always wins over the configured capacity or preferred fill amount.

The preferred phase fill amount is user-configurable. For example, a 1kg-bag workflow may use 300g phases, while another user may choose 250g phases. The phase fill amount becomes the denominator for phase percentage unless a specific fill/reconciliation event supplies a different measured baseline.

The app may check the selected phase fill amount against estimated bag remaining, but it must ask the user to confirm or adjust rather than silently changing the phase. Bag-level remaining estimates are useful warnings; the active hopper phase is the operational source for current hopper mass when hopper tracking is enabled.

### Hopper baseline calculations

For each `Hopper Range`, the baseline table stores:

- A maintained `Baseline Output (g)`.
- Observed `Avg Initial Output (g)`.
- Supporting `Count`.
- Baseline status and adjustment date.

Shots receive the selected range baseline as `Baseline Unaided Output (g)`. `Baseline Output Delta (g)` compares actual Initial Output to that baseline. Threshold, behavior, severity, top-up gap, and correction outputs are downstream HMI fields.

### Unresolved hopper assignment rules

- Whether every fill creates a new Hopper record or whether some fills update the active state.
- Whether a top-up continues the current record or starts a new phase; the user should explicitly choose when a refill is a phase transition.
- How Shot timestamps are assigned when states overlap.
- Whether only one Hopper record may be Active.
- How retention, purge, and reconciliation alter `Hopper Mass (g)`.

These must be recovered from Airtable formulas/automations rather than inferred from UI code.

## Supporting reference tables

| Table | Relationship status | Function |
|---|---|---|
| Project Notes | Conceptual, not exported as linked records | Dated governance, formula history, hypotheses, and confidence. |
| Shot Fault Rules | Rule dependency, not exported as linked records | Determines fault classification and analysis eligibility. |
| 10-Point Rating System | Interpretive dependency | Defines rating and preference meaning. |

## Remaining application relationship gaps

- Project Notes, Shot Fault Rules, and Rating Systems do not yet have first-class application tables.
- Exact Hopper percentage, retention, purge, reconciliation, and automatic phase-transition formulas remain source-owned and unresolved.

## Phase 1 relationship implementation

Phase 1 adds typed `Hopper → Shots` and `Hopper Range Baseline → Shots` foreign keys. Airtable synchronization resolves linked record IDs; CSV import resolves exact exported Hopper names and range labels after Hopper/baseline data is imported. No Bag relationship is inferred from Hopper names when the source export does not provide one.
