# BigShotEspresso Master Development Roadmap

> **Version:** 1.0 governance edition  
> **Authority:** Subordinate only to [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md)  
> **Source:** `BigShotEspresso_Master_Development_Roadmap_v1.0.md`

| Phase | Name | Status |
|---|---|---|
| 0 | Project Architecture | Documentation completed |
| 1 | Data Foundation | Implemented; deployment verification pending |
| 1.5 | Foundation Stabilization | Owner-alpha RC declared 2026-08-28; Airtable gates 5/8 remain open |
| 2 | Coffee Log Application Completion | **2A authorized (narrow, 2026-09-28)** — see [phase-2a-scope-authorization](implementation/phase-2a-scope-authorization.md). **2B authorized 2026-10-01** (pre-outside-user readiness: docs, housekeeping, verification, ops and security hardening; **no** auth code) — see [phase-2b-scope-authorization](implementation/phase-2b-scope-authorization.md). Remainder not authorized |
| 2.5 | Knowledge & Provenance System | Governance foundation initiated |
| 3 | Dose Consistency Intelligence (DCI) | Not authorized |
| 4 | Operational Success Intelligence (OSI) | Not authorized |
| 5 | Hopper Mechanics Intelligence (HMI) | Not authorized |
| 6 | Bag Lifecycle Intelligence (BLI) | Not authorized |
| 7 | Model Exception Intelligence (MSI) | Not authorized |
| 8 | Grind Success Predictor (GSP) | Not authorized |
| 9 | AI Coffee Assistant | Future |
| 10 | Knowledge Synchronization Engine | Future |
| 11 | Performance & Production | Future |
| 12 | Research Platform | Future |
| Future | Brew Curves and Bluetooth Device Compatibility | Deferred until post-revenue R&D |

## Phase descriptions

### Phase 0 — Project Architecture

Architecture, CSV dictionary, relationships, field types, intelligence definitions, and application audit.

### Phase 1 — Data Foundation

Typed schema, CSV import, Airtable mapping, Flow Time migration, multi-selects, OpenAPI correction, and Hopper models.

### Phase 1.5 — Foundation Stabilization

Migration validation, CSV verification, Airtable synchronization verification, OpenAPI/runtime agreement, analytical eligibility, active-Bag isolation, and integration tests.

External completion gates:

- Live Airtable synchronization rehearsal.
- Production-equivalent PostgreSQL forward/rollback rehearsal.

### Phase 2 — Coffee Log Application Completion

Quick Log, Full Log, Shot Edit, Shot List, Dashboard completion, Hopper workflow, Active Bag workflow, and Airtable parity.

### Phase 2.5 — Knowledge & Provenance System

Development Change Log, Knowledge Change Log, Operational Audit Log, ADRs, and Synchronization Log.

### Phases 3–8 — Intelligence

Implement in this constitutional order:

1. DCI
2. OSI
3. Hopper Workflow prerequisite
4. HMI
5. BLI
6. MSI
7. GSP

No intelligence phase may begin without approved evidence, formulas, confidence policy, scope, and tests.

Owner-alpha may ship transparent, bag-specific **Next Shot Reminder** cards before Phase 3 begins. These are workflow nudges, not intelligence-engine output: they must show their evidence, stay personal to the active Bag, never auto-change settings, and avoid generalized forecasting claims. Formal DCI/GSP work still requires the approval gates above.

### Future — Brew Curves and Bluetooth Device Compatibility

Brew-curve capture, Bluetooth scale integration, machine/grinder/device compatibility, and live extraction telemetry are future research-and-development features. They are not required for first release and must not block manual logging, core workflows, or the Phase 2–8 intelligence roadmap.

This module should be revisited only after BSE is live, has a paying user base, and subscription revenue can support device testing and experimentation. Current shot, bag, hopper, machine, grinder, and accessory records should remain linkable to future device-session or brew-curve records, but no Bluetooth, brew-curve, or live-device functionality is authorized in the current phase.

Users may eventually be able to upload a telemetry file (e.g. an export from an advanced machine's own app) as an alternative to live Bluetooth integration. When this is built, uploaded telemetry should attach as evidence to the Shot, System Phase, or Experiment it belongs to, with clear provenance (source, upload date, confidence), the same way other imported evidence is already handled — not implemented now, and not a substitute for deciding the live-Bluetooth question separately.

## Status change record

- 2026-09-28 — Phase 2 row changed from "Not authorized" to "2A authorized (narrow)"; Phase 1.5 row changed from "Locally complete; external gates pending" to reflect the RC declaration. Rationale, impact, and waivers: [phase-2a-scope-authorization.md](implementation/phase-2a-scope-authorization.md). Approved by Carl (2026-09-28 planning session). No phase sequence or authority changed, so no ADR is required.

- 2026-10-01 — Phase 2 row extended with **2B (pre-outside-user readiness)**; previous text was "2A authorized (narrow, 2026-09-28) ... remainder not authorized". Rationale: Carl asked to prepare for invite-only outside beta users and the Clerk track. Impact: authorizes docs, housekeeping, verification, operations and auth-independent security work only; accounts/auth/Clerk code, `user_id` migration, billing and intelligence phases stay unauthorized. Governing records: [ADR-0009](ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md) (accepted as design direction), [ADR-0011](ADR/ADR-0011-clickonomics-platform-and-clerk-identity.md), [phase-2b-scope-authorization](implementation/phase-2b-scope-authorization.md).

## Roadmap change control

Roadmap changes require:

1. Written rationale.
2. Impact assessment.
3. User approval.
4. An ADR when architectural sequence or authority changes.
5. Preservation of the superseded roadmap in [HISTORY](HISTORY/README.md).
