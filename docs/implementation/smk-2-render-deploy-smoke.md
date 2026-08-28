# SMK-2 — Render Deploy Smoke

> **Status:** Runbook + pre-deploy evidence
> **Created:** 2026-08-28
> **Scope:** First Render deploy of Coffee Log / BigShotEspresso, `main` @ `c792c8b`
> **Boundary:** Documentation only. This file does not deploy, change DNS, set secrets, or modify app code.
> **Cross-refs:** [Release Candidate Checklist](release-candidate-checklist.md) Gate 11 · [Render Deployment Prep](render-deployment-prep.md) · [Render Environment Checklist](render-environment-checklist.md) · [Owner-Only Release Smoke Test](owner-only-release-smoke-test.md) Deployment Smoke Test

SMK-1 is the local/live app-behaviour smoke pass. **SMK-2 is this: prove the Render-built
production artifact boots and serves correctly, then prove the same on the live Render URL
once Carl deploys.**

---

## Part 1 — Verifiable now (no Render access): production-artifact boot

This half was executed on 2026-08-28 against `main` @ `c792c8b` from the primary checkout
`/Users/carlenns/Documents/BigShotEspresso/Coffee-Log` (not a worktree).

### Steps (reproducible)

```bash
# 1. Build exactly what Render builds
CI=true pnpm run build:render
#    -> pnpm --filter @workspace/coffee-log build   (vite -> dist/public/…)
#    -> pnpm --filter @workspace/api-server build    (esbuild -> dist/index.mjs)

# 2. Boot the built artifact the way `start:render` does, on a free port,
#    with DATABASE_URL supplied from .env (Render supplies it as an env var):
set -a && . ./.env && set +a
PORT=8097 NODE_ENV=production BASE_PATH=/ \
  node --enable-source-maps artifacts/api-server/dist/index.mjs

# 3. Route checks
for p in / /settings /shots/new /shots/quick /api/healthz; do
  curl -s -o /dev/null -w "%{http_code} %{content_type}  $p\n" "http://localhost:8097$p"
done
curl -s "http://localhost:8097/api/shots?limit=1"   # one real API read

# 4. Kill the server when done.
```

### Result — PASS (2026-08-28)

| Check | Result |
| --- | --- |
| `CI=true pnpm run build:render` | exit 0 — client bundle `index-*.js` 773 kB / `index-*.css` 124 kB; server `dist/index.mjs` 2.3 MB. Only benign warnings (vite chunk-size, sourcemap-for-warning noise). |
| Server boot on `PORT=8097`, `NODE_ENV=production`, `BASE_PATH=/` | Booted; `index.ts` requires + validates `PORT` (throws if missing/invalid) — Render's injected `PORT` is honoured. |
| `GET /` | `200 text/html` |
| `GET /settings` | `200 text/html` |
| `GET /shots/new` | `200 text/html` |
| `GET /shots/quick` | `200 text/html` (SPA fallback; client then redirects to `/shots/new`) |
| `GET /api/healthz` | `200 application/json` → `{"status":"ok"}` |
| SPA fallback body | client routes serve `dist/public/index.html` (`<title>Coffee Log</title>`), not a 404 |
| `GET /api/shots?limit=1` | `200` with a real shot row — API ↔ Neon connection works from the built artifact |

This is a second independent data point; Agent 3 already saw the same pass on `:8093`.

### Not covered by Part 1

- TLS / custom domain / Render edge behaviour.
- Render's own `pnpm install --frozen-lockfile && pnpm run build:render` in a clean
  container (lockfile drift, Node version). Local build used the committed `pnpm-lock.yaml`.
- `ADMIN_API_TOKEN`-gated admin/bulk routes (not exercised).
- Cold-start time on Render free plan.

---

## Part 2 — Blocked on Carl: live Render deploy smoke

Carl must do these — they need the Render dashboard and the production Neon URL.

### 2a. Configure the service (once)

- [ ] Render web service exists for this repo (Blueprint from `render.yaml`, or manual Node
      web service with **Build:** `pnpm install --frozen-lockfile && pnpm run build:render`,
      **Start:** `pnpm run start:render`).
- [ ] Env vars set in Render (per `render.yaml` + [Render Environment Checklist](render-environment-checklist.md)):
  - [ ] `DATABASE_URL` — **production** Neon URL (NOT the rehearsal DB, NOT a local URL). `sync:false`.
  - [ ] `ADMIN_API_TOKEN` — a strong secret. `sync:false`.
  - [ ] `NODE_ENV=production` (in Blueprint).
  - [ ] `BASE_PATH=/` (in Blueprint).
  - [ ] `CORS_ORIGIN` — **leave unset** (same-origin service). Set only if frontend/API are deliberately split.
  - [ ] Airtable vars — only if Airtable sync is in release scope (it is not, for first release).
- [ ] Confirm no secret value is visible in the Render build log or in the committed `render.yaml`.

### 2b. Deploy

- [ ] Trigger a deploy of `main` @ `c792c8b` (confirm the deployed commit SHA in Render matches).
- [ ] Build succeeds in Render (watch for `frozen-lockfile` / Node-version failures — the two
      gaps Part 1 could not check).
- [ ] Service reaches "Live".

### 2c. Live smoke (repeat Part 1's checks against the Render URL `https://<service>.onrender.com`)

- [ ] `GET /` → 200, Coffee Log frontend renders (not blank).
- [ ] `GET /settings` → 200, renders.
- [ ] `GET /shots/new` → 200, Log Shot form renders.
- [ ] Hard-refresh a deep route (`/shots/<id>`, `/bags/<id>`) → 200, renders (SPA fallback works on Render).
- [ ] `/shots/quick` → loads then client-redirects to `/shots/new`.
- [ ] `GET /api/healthz` → `{"status":"ok"}`.
- [ ] One real API read in the browser (open Dashboard or Shot Log) → data loads from **production Neon**.
- [ ] DevTools console: no startup errors; **no CORS error** on `/api/*` calls (they must be same-origin —
      `https://<service>.onrender.com/api/...`, not a cross-origin host).
- [ ] DevTools Network: no secret / `DATABASE_URL` / token value in any response body or JS bundle.
- [ ] Admin/bulk routes: a `POST` to an admin route without `x-admin-token` is rejected (401/403).
- [ ] (If custom domain is being set now) domain resolves to this Render service — see [Domain Setup Checklist](domain-setup-checklist.md).

### 2d. Record

- [ ] Paste the Render URL, deployed SHA, and the 2c results into this file (or the RC checklist Gate 11).
- [ ] SMK-2 passes only when every 2c box is checked with no CORS error, no secret exposure,
      and no blank-page / 404 on deep routes.

---

## Release blockers (stop the deploy if any is true)

- `DATABASE_URL` missing, or pointing at the rehearsal/local DB.
- Any credential visible in source, `render.yaml`, build log, response body, or JS bundle.
- Admin/destructive routes reachable without `ADMIN_API_TOKEN`.
- App cannot start from a clean Render build (lockfile / Node version).
- Deep-route hard refresh returns a blank page or 404 on Render.
- `/api/*` calls fail with CORS in the browser.
