# Release Candidate Checklist

> **Status:** Draft release-readiness checklist  
> **Created:** 2026-08-17  
> **Release target:** Coffee Log / BigShotEspresso first useful Postgres-backed release  
> **Boundary:** This checklist does not implement code, schemas, APIs, migrations, deployment, or intelligence engines.

## Release Definition

The first release candidate does not require every intelligence engine to be complete.

The first releasable version should prove that Coffee Log can:

- run from Postgres/Neon as the operational database,
- preserve Airtable/CSV evidence,
- import or sync Coffee Log data safely,
- support core shot review/logging workflows,
- show correct dashboard/reference behavior,
- expose enough admin/debug visibility to diagnose bad data,
- protect secrets and private data,
- and deploy repeatably.

## Non-Goals For First Release

Do not block first release on:

- DCI implementation.
- OSI implementation.
- HMI implementation.
- BLI implementation.
- MSI implementation.
- GSP implementation.
- AI Coffee Assistant.
- Full Airtable replacement admin UI.
- Public multi-user/subscriber launch.

The first release is a stable operational foundation, not the finished research platform.

Current access assumption:

- The first release candidate is owner-only.
- Public self-serve launch is blocked until authentication, authorization, and data ownership rules are implemented.
- See [ADR-0008: Owner-Only First Release Access](../ADR/ADR-0008-owner-only-first-release-access.md).

## Release Candidate Gate Summary

| Gate | Status | Required before first release candidate? |
| --- | --- | --- |
| Repository baseline and CI | Mostly ready | Yes |
| Secret/security baseline | Mostly ready | Yes |
| Neon Postgres rehearsal | Migration/bootstrap/API smoke/full import passed | Yes |
| Migration and rollback verification | Passed for Phase 1 legacy upgrade path | Yes |
| CSV fixture import verification | Mostly ready | Yes |
| Full local export rehearsal | Passed against disposable Neon | Strongly recommended |
| Airtable metadata verification | Blocked | Required before Airtable sync certification |
| Airtable live sync dry run | Blocked | Required if release depends on live sync |
| Core runtime API checks | Read-only smoke passed against Neon | Yes |
| Dashboard correctness | Partially ready | Yes |
| Shot entry/edit workflow | Mutating lifecycle smoke passed against Neon | Yes |
| Color-blind friendly UI cues | Required for important indicators | Yes |
| Access-control/public-launch decision | Proposed owner-only | Yes |
| Admin/debug visibility | Needs scope decision | Strongly recommended |
| Render deployment prep | Render URL/API smoke passed; optional dashboard SHA/build-log confirmation remains | Yes |
| Domain setup prep | Planned | Yes |
| Replit deployment prep | Deferred | No, unless Replit is selected later |
| Backup/recovery plan | Documented; disposable Neon rehearsal passed | Yes |

## Gate 0.5 — Launch Logging Scope

Quick Log is shelved for the first owner-only release candidate. The app should use one primary `Log Shot` workflow based on the full shot form because that workflow is now mobile-friendly, editable, and better aligned with the scientific record.

The existing Quick Log code may remain in the repository as a parked prototype, but it should not be promoted in primary navigation or Settings during launch hardening. Quick Log can be revisited after real user demand proves that a separate reduced-entry mode is worth the extra workflow complexity.

Drink Type defaults are single-level for the first release candidate: there is one user-level `Default Drink Type` in Settings, plus user-extensible custom drink types. Machine-level and grinder/profile-level drink type defaults (for example, a specific machine+grinder setup implying Americano, or a decaf/pour-over/guest setup implying a different default) are shelved for now and should not be implemented. `Log Shot` now exposes Machine and Grinder selectors (added 2026-08-25), but they are not yet wired into any drink-type-default logic — that remains shelved on its own until it's specifically scoped, not automatically unblocked by the selectors existing. Reconsider machine/profile-level drink defaults only after users/OAuth exist (see ADR-0009).

**Brew Method is a separate, distinct concept from Drink Type** — see `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md` §4.1.1. Brew Method (how it was extracted, e.g. Espresso) is not the same question as Drink Type (what was served, e.g. Americano), and this Gate 0.5 decision about Drink Type defaults does not extend to Brew Method, which has no shot-level field at all yet and is unrelated launch scope.

## Gate 1 — Repository and CI

Required:

- Main branch is pushed.
- CI workflow exists.
- Current CI passes.
- Repository has clear governance docs.
- Release checklist is linked from `START_HERE.md`.

Verification:

- GitHub Actions latest run passes.
- Local working tree is clean before release tag/deploy.

## Gate 2 — Security Baseline

Required:

- No hardcoded Airtable tokens.
- No hardcoded Neon/Postgres connection strings.
- No `.env` or `.env.*` committed.
- `.env.example` allowed if it contains placeholders only.
- App-specific Airtable environment variables are preferred:
  - `COFFEELOG_AIRTABLE_API_KEY`
  - `COFFEELOG_AIRTABLE_BASE_ID`
- Legacy Airtable variables remain temporary fallback only.
- `DATABASE_URL` is stored only in secret/environment configuration.
- Logs do not print secret values.

Verification:

- Secret scan across tracked and untracked files.
- GitHub secret scanning/security alerts reviewed where available.
- Dependency audit reviewed.
- Admin routes reviewed before public deployment.

## Gate 2.5 — Accessibility and Color-Blind Friendly UI

Required:

- Important app meaning is not communicated by color alone.
- Status dots, icons, badges, charts, and dashboard comparison markers include redundant cues such as labels, shape, pattern, contrast, or text.
- Red/yellow/green states remain readable for color-blind users.
- Mobile logging and dashboard review remain understandable without relying on subtle color differences.

Verification:

- Manual review of shot logging, shot detail, dashboard comparison, current bag intelligence, reference windows, and warning/success states.
- Confirm that critical states such as included/excluded analysis, reference confidence, within/outside comparison, and warning/success messages have text or pattern support.
- Confirm the mobile bottom navigation's active tab is distinguishable without color (underline + label weight, not text-color alone), and that its horizontal scrollability is visually signaled (edge fade), not just present in the markup — reviewed and fixed 2026-08-25; the scroll mechanism itself was already correct, but had no visual cue that it scrolled, which is what made Settings unreachable-in-practice on phone even though it was already in the nav.

## Gate 3 — Neon Postgres Rehearsal

Required:

- Use a disposable Neon target.
- Apply empty-database bootstrap migration.
- Apply forward migration.
- Re-run forward migration where safe.
- Run rollback.
- Run forward migration after rollback.
- Record results.

Evidence:

- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)
- [Neon Postgres Rehearsal Report](neon-postgres-rehearsal-report.md)

Output after execution:

- `docs/implementation/neon-postgres-rehearsal-report.md`

## Gate 4 — Data Import Verification

Required:

- Committed CSV fixtures import successfully.
- Import fingerprints prevent duplicate imports.
- Multi-select fields preserve values/order.
- `Flow Time (sec)` maps to canonical `flow_time`.
- Historical `Scale Time` compatibility remains verified.
- `Include in Analysis` survives import.
- Hopper and Hopper Range Baseline fixtures import successfully.

Strongly recommended:

- Full local 235-shot export rehearsal against disposable Neon.
- Current full Hopper 17-row/9-column export review.

Do not:

- Commit full exports automatically.
- Treat local full exports as public fixtures without privacy review.

## Gate 5 — Airtable Verification

Required if release depends on Airtable sync:

- Metadata verification run completed.
- Field types captured.
- Formula/rollup/lookup sources captured.
- Relationship cardinality captured.
- Selector/multi-select options captured.
- Hidden fields and view scope documented.
- Live sync dry run completed against disposable database.

Evidence:

- [Airtable Metadata Verification Runbook](../architecture/airtable-metadata-verification-runbook.md)

If Airtable API remains blocked:

- First release may proceed only if it does not require live Airtable sync at runtime.
- CSV import/manual data path must be sufficient for the release scope.

## Gate 6 — Runtime API Contract

Required:

- API starts using Neon `DATABASE_URL`.
- Health route works.
- Shot list route returns expected `{ shots, total }` shape.
- Shot detail route works.
- Hopper/baseline routes work if included in release UI.
- OpenAPI contract matches runtime behavior.
- Generated clients/types match API.

Verification:

- API package typecheck passed locally.
- Frontend package typecheck passed locally.
- Database package typecheck passed locally.
- API production build passed locally.
- Frontend production build passed locally.
- Read-only manual smoke checks passed against disposable Neon for health, Shots, Hopper, and Hopper Range Baseline routes.

Remaining:

- Manual UI form smoke check.

Completed:

- Shot detail route smoke check.
- Shot create/edit/delete API workflow smoke check.
- Full CSV import against the bootstrapped Neon schema.

## Gate 7 — Dashboard Correctness

Required:

- Current Shot vs Reference uses active-Bag isolation.
- Excluded shots do not affect performance analytics.
- Reference shots are manual reference shots, not inferred from rating.
- Insufficient-reference-data state renders clearly.
- Bag A never silently uses Bag B references.

Verification:

- Dashboard route test or manual smoke fixture.
- Active Bag scenario.
- No-reference scenario.
- Excluded-reference scenario.

Evidence (2026-08-28):

- The Current-Shot-vs-Reference selection was extracted from `routes/dashboard.ts`
  into a pure helper, `artifacts/api-server/src/lib/dashboard-comparison.ts`
  (`selectComparisonReferences(activeBagShots)`). The route's output is unchanged
  — it still passes the same active-bag, `include_in_analysis = true`,
  newest-first array and shapes the same `shotComparison` response.
- `artifacts/api-server/src/dashboard-comparison.test.ts` — behavioural unit
  tests on fixture shot arrays, one per property:
  - **7.1 active-Bag isolation** — a fixture with Bag A and Bag B reference shots;
    the pool for Bag A is `[A]` only, and switching the active bag switches the
    pool wholesale (no carryover). The route feeds the helper only bag-scoped rows
    (`where(eq(shotsTable.bagId, activeBagRow.id), ...eligibleShotConditions)`),
    locked by a source-scan in `analytics.integration.test.ts`; the existing
    "Current Shot vs Reference is strictly isolated to the active Bag" PGlite test
    still covers the SQL layer.
  - **7.2 excluded shots** — an excluded reference (`include_in_analysis = false`)
    never reaches the pool, and an excluded shot that is newest by date is never
    the "current" shot.
  - **7.3 manual references** — a rating-10 non-reference is absent from the pool;
    a rating-5 reference and a reference with no rating at all are present. The
    helper filters on `isReference === true` and reads no rating/score field
    (source-scan asserts the helper body contains no `rating|score`).
  - **7.4 insufficient-reference-data** — an empty pool yields
    `hasSufficientReferences: false`, which the route renders as
    `bagReference: null`; `Dashboard.tsx` shows the labelled card "No reference
    data — log reference shots to enable comparison." (not zeros).
- Verified: `CI=true pnpm run typecheck` · `CI=true pnpm --filter
  @workspace/api-server test` (88, +5) · `CI=true pnpm run build:render` — all pass.

## Gate 8 — Shot Entry and Review Workflow

Required:

- Create shot works with current field model.
- Edit shot works for approved editable fields.
- Read-only/imported evidence fields are not silently overwritten.
- Multi-select fields round-trip as arrays.
- `Include in Analysis` default is correct for locally-created shots.
- `Flow Time` is the UI/API name.

Verification:

- Manual/API-backed lifecycle smoke test.
- Typecheck/build.
- API request validation.

Evidence:

- SMK-1 mutating lifecycle pass recorded in `docs/completed-tasks.md` on 2026-08-28:
  labelled test bean/bags/hoppers/shot were created, optional field clearing was
  verified by reload/readback, blocked bean delete returned a human 409 message,
  test data was removed, and the owner active Bag #7 + attached Hopper Phase 2
  were restored. Bag #7 remains System Phase 3; Hopper Phase 2 is a separate
  hopper-fill concept.

## Gate 9 — Admin and Debug Visibility

Strongly recommended before release:

- Show import/sync status.
- Show raw import evidence for a record.
- Show unresolved relationships.
- Show excluded-shot counts versus analytical counts.
- Show active Bag and active Hopper status.
- Show fixture/full-export mismatch notes if relevant.

Minimum release rule:

- There must be some way to diagnose bad data without editing the database directly.

Evidence (2026-08-28, Option A — route the existing page read-only):

- `/data-health` (`artifacts/coffee-log/src/pages/ImportAudit.tsx`, default export
  `DataHealth`) is now routed in `App.tsx` and linked from the desktop "System"
  nav group and the mobile "Setup & System" menu. Previously the component
  existed but was unreachable.
- The page is strictly read-only: it reads `GET /api/airtable/status` and
  `GET /api/airtable/counts` and shows credential presence, per-table record
  counts with the `fromAirtable` provenance split, the last sync summary
  (inserted/updated/skipped/errors per table), and the last clear event. The
  former "Sync from Airtable" and "Clear All Coffee Data" write actions were
  removed entirely — no component in the app calls `/api/airtable/sync` or
  `/api/airtable/clear` any more.
- Covers the minimum rule (diagnose without touching the DB) and several
  "strongly recommended" points: import/sync status, provenance per record type,
  and — via the counts card border cues — which records look like CSV vs Airtable
  data. Excluded-vs-analytical shot counts and unresolved-relationship views are
  still served by the existing `/api/shots/audit` endpoint, not surfaced on this
  page (left for a later pass).
- Locked by `api-contract.test.ts` → "Data Health is a routed, read-only
  owner-diagnostics page (RC Gate 9)".
- Verified: `CI=true pnpm run typecheck` · `CI=true pnpm --filter
  @workspace/api-server test` (89) · `CI=true pnpm run build:render` — all pass.

## Gate 10 — Backup and Recovery

Required:

- Know how to export/backup Neon data.
- Know how to restore or recreate a disposable environment.
- Keep Airtable/CSV evidence separate from production runtime data.
- Do not rely on Airtable as the only backup once Postgres becomes authority.

Verification:

- Document backup approach.
- Run at least one restore/recreate rehearsal or document why deferred.
- Use the [Neon Backup and Restore Runbook](neon-backup-restore-runbook.md).

## Gate 11 — Deployment Prep

Required for current Render-first release path:

- Render environment variables configured.
- `render.yaml` reviewed before Blueprint creation.
- App uses `DATABASE_URL` from environment.
- App-specific Airtable variables configured only if sync is included.
- Build/start command verified.
- Deployment shape selected: one integrated Render web service serving API and frontend.
- Public URL smoke-tested.
- Custom domain plan prepared.

Do not:

- Use a personal/local database connection in deployed Render.
- Put credentials in source files, logs, or screenshots.

Evidence:

- [SMK-2 — Render Deploy Smoke](smk-2-render-deploy-smoke.md) — local artifact-boot PASS and live Render URL/API smoke PASS (2026-08-28, `main` @ `1587a01`); exact deployed SHA/build-log confirmation remains optional Render-dashboard evidence
- [Render Deployment Prep](render-deployment-prep.md)
- [Render Environment Checklist](render-environment-checklist.md)
- [Domain Setup Checklist](domain-setup-checklist.md)
- [Owner-Only Release Smoke Test](owner-only-release-smoke-test.md)
- [Replit Deployment Prep](replit-deployment-prep.md), optional/deferred

## Gate 12 — Release Decision

Release candidate can be declared only when:

- CI passes.
- Neon rehearsal passes.
- Migration/rollback evidence exists.
- Security baseline passes.
- Core app workflow passes.
- Dashboard correctness passes.
- Deployment smoke test passes.
- Known blockers are either fixed or explicitly accepted.

## Recommended Release Order

1. Finish Neon rehearsal.
2. Produce Neon rehearsal report.
3. Run security baseline scan.
4. Run API/build/typecheck checks.
5. Smoke-test core app against disposable Neon.
6. Decide whether release includes Airtable sync or CSV-only import.
7. Prepare Render deployment.
8. Smoke-test deployed app.
9. Produce release candidate report.
10. Tag/release only after approval.

## Current Recommendation

Proceed toward a first Coffee Log release candidate before intelligence engines.

The first release should be Postgres/Neon-backed, secure, testable, and useful for logging/reviewing Coffee Log data. Intelligence engines should start only after this operational foundation is stable.
