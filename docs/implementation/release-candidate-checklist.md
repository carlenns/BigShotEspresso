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

## Release Candidate Gate Summary

| Gate | Status | Required before first release candidate? |
| --- | --- | --- |
| Repository baseline and CI | Mostly ready | Yes |
| Secret/security baseline | Mostly ready | Yes |
| Neon Postgres rehearsal | Planned | Yes |
| Migration and rollback verification | Planned | Yes |
| CSV fixture import verification | Mostly ready | Yes |
| Full local export rehearsal | Not started | Strongly recommended |
| Airtable metadata verification | Blocked | Required before Airtable sync certification |
| Airtable live sync dry run | Blocked | Required if release depends on live sync |
| Core runtime API checks | Not started against Neon | Yes |
| Dashboard correctness | Partially ready | Yes |
| Shot entry/edit workflow | Needs release review | Yes |
| Admin/debug visibility | Needs scope decision | Strongly recommended |
| Render deployment prep | Planned | Yes |
| Domain setup prep | Planned | Yes |
| Replit deployment prep | Deferred | No, unless Replit is selected later |
| Backup/recovery plan | Not started | Yes |

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

## Gate 3 — Neon Postgres Rehearsal

Required:

- Use a disposable Neon target.
- Apply forward migration.
- Re-run forward migration where safe.
- Run rollback.
- Run forward migration after rollback.
- Record results.

Evidence:

- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)

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

- API contract validation.
- Typecheck.
- Production build.
- Route tests or manual smoke checks against disposable Neon.

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

## Gate 8 — Shot Entry and Review Workflow

Required:

- Create shot works with current field model.
- Edit shot works for approved editable fields.
- Read-only/imported evidence fields are not silently overwritten.
- Multi-select fields round-trip as arrays.
- `Include in Analysis` default is correct for locally-created shots.
- `Flow Time` is the UI/API name.

Verification:

- Manual smoke test.
- Typecheck/build.
- API request validation.

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

## Gate 10 — Backup and Recovery

Required:

- Know how to export/backup Neon data.
- Know how to restore or recreate a disposable environment.
- Keep Airtable/CSV evidence separate from production runtime data.
- Do not rely on Airtable as the only backup once Postgres becomes authority.

Verification:

- Document backup approach.
- Run at least one restore/recreate rehearsal or document why deferred.

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

- [Render Deployment Prep](render-deployment-prep.md)
- [Domain Setup Checklist](domain-setup-checklist.md)
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
7. Prepare Replit deployment.
8. Smoke-test deployed app.
9. Produce release candidate report.
10. Tag/release only after approval.

## Current Recommendation

Proceed toward a first Coffee Log release candidate before intelligence engines.

The first release should be Postgres/Neon-backed, secure, testable, and useful for logging/reviewing Coffee Log data. Intelligence engines should start only after this operational foundation is stable.
