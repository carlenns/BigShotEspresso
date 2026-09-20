# Clickonomics Market + Clerk Login Integration Plan

Status: **Planning / architecture only — authorizes nothing.**
Created: 2026-09-08
Author: Claude (Agent 3 orchestration), from Codex handoff `HANDOFF-2026-09-08_08-57-32_CDT-clickonomics-clerk.md`
Base commit: `2572346` (`Coffee-Log`, branch `main`)

> **Superseded at the platform level (2026-09-08):** after this discovery was
> completed, the owner clarified that Clickonomics is intended to be the
> customer frontend, marketplace, authentication/subscription/billing control
> plane, and intelligence/dashboard product. BigShotEspresso and other apps sit
> behind it while retaining independent brands and deployments. See
> [clickonomics-platform-architecture.md](clickonomics-platform-architecture.md)
> for the authoritative product relationship, domain model, segregation, and
> corrected implementation order. Preserve this document for its verified BSE
> schema, migration, ownership, and isolation-test analysis; do **not** execute
> its BSE-primary Clerk topology or Phase 1 prompt.

## Purpose and scope

Codex asked for a phased plan to move BigShotEspresso / Coffee-Log from owner-only
alpha ([ADR-0008](../ADR/ADR-0008-owner-only-first-release-access.md)) to
logged-in users via **Clerk**, and to place BSE inside the **Clickonomics market**.

This document is the Phase 0 discovery output plus the sequencing plan. No auth
code, schema, migration, or marketplace wiring is authorized by it. It **revises
the authentication-mechanism recommendation** in
[auth-data-ownership-implementation-plan.md](auth-data-ownership-implementation-plan.md)
(self-built email + magic-link) to **Clerk as a managed provider**, and leaves
that plan's row-level `user_id` ownership model unchanged. ADR-0009's ownership
decision stands; only its Open Question 1 (auth mechanism) is answered here, and
that answer still needs Carl's approval before Phase 1.

---

## 1. Current state found (Phase 0 discovery)

### 1.1 What "the Clickonomics market" actually is today

**It is a single-page marketing website, not a marketplace.** Inspected
`/Users/carlenns/Documents/BigShotEspresso/Clickonomics` (separate git repo, 2
commits):

- Stack: `vinext` 1.0.0-beta (OpenAI Sites build), React 19 RSC, Tailwind 4,
  shadcn. `render.yaml` (`starter` plan) + Cloudflare Workers/Wrangler artifacts
  present. Deploy target `clickonomics.ca` (not yet connected per `README.md`).
- Content: one `app/page.tsx` (152 lines) — a studio pitch for "custom dashboard
  design and maintenance". Services / process / contact sections. No routing
  beyond `/`.
- **Only integration with BSE today:** a server-side `fetch` of
  `https://bigshotespresso.onrender.com/api/dashboard/summary` (public,
  read-only, `revalidate: 300`) rendered as a live "portfolio sample" tile.
- **No** app catalog, no "install"/"launch" concept, no user accounts, no Clerk,
  no auth, no login, no per-user anything. Env vars: `NODE_VERSION`, `NODE_ENV`
  only.

**Conclusion:** the "Clickonomics market" is a *docs-only / aspirational concept*.
It does not exist in the repo. Any "marketplace" is greenfield and must be
separately specced; this plan's Clickonomics work (Phase 6) is deliberately
scoped to a **launch/sign-in link-out only**.

### 1.2 What Clerk integration already exists

**None.** No `@clerk/*` dependency anywhere in either repo. No Clerk env vars, no
`<ClerkProvider>`, no backend middleware, no webhook route, no `users` table, no
org/account model, no billing.

### 1.3 BigShotEspresso architecture relevant to auth

| Concern | Current state |
|---|---|
| Monorepo | pnpm workspace. `artifacts/coffee-log` (SPA), `artifacts/api-server` (Express), `lib/db` (Drizzle schema + migrations), `lib/api-client-react` (generated Orval client), `lib/api-spec` (OpenAPI), `lib/api-zod`. |
| Frontend | Vite + React SPA. Router: `wouter`. Data: TanStack Query + generated client. `App.tsx` has **zero** auth routing/guards. `Shell.tsx` has **zero** account UI. `main.tsx` is a bare `createRoot(...).render(<App/>)`. |
| API client | `lib/api-client-react/src/custom-fetch.ts` **already exposes `setBaseUrl()` and `setAuthTokenGetter()`** — a bearer-token seam exists (`Authorization: Bearer <token>` attached per request when a getter is registered). Comment warns it is intended for native bundles, "never … in web applications where session cookies are automatic". ~40+ `fetch`/generated-hook call sites across `src/pages`. |
| Backend | Express + `pino-http` + `cors` + Drizzle. In production the same Express process serves the SPA static build (`app.ts` static handler) — **BSE frontend and API are same-origin in production.** |
| Existing access control | `requireAdminToken` (`middlewares/admin-auth.ts`) — one shared `ADMIN_API_TOKEN`, `timingSafeEqual`, **production only**, gating exactly 6 bulk routes (`app.ts` lines 51–56): Airtable clear/sync, 3 CSV imports, taste-selector seed. No concept of individual identity. |
| User-data routes with **no** scoping | `routes/`: `accessories.ts`, `bags.ts`, `beans.ts`, `dashboard.ts`, `equipment.ts`, `hopper.ts`, `insights.ts`, `settings.ts`, `shots.ts`, `taste-selectors.ts`. |
| DB | Neon Postgres. Drizzle schema in `lib/db/src/schema/*.ts`. Migrations: hand-written numbered pairs `0000`–`0012`, each with a `.down.sql`. Applied via bootstrap/rehearsal scripts (`scripts/neon-*.mjs`); no `drizzle-kit` auto-generate in the release path. |
| Ownership gap (ADR-0009, re-verified — schema unchanged since) | **No `user_id`/`owner_id` on any table.** `settings.key` carries a **global** `UNIQUE(key)` — blocks two users having the same key. Test suite: ~89 API/server tests (Gate 9 count) read/write these tables with no user context. |
| Deploy | Render free web service `bigshotespresso-coffee-log`, `oregon`. Env: `NODE_ENV`, `BASE_PATH`, `DATABASE_URL` (secret), `ADMIN_API_TOKEN` (secret). |

### 1.4 Does ADR-0009 still recommend magic-link / Clerk-style auth?

ADR-0009 **deliberately left the mechanism open** (Open Question 1) — it only
fixed the *ownership model* (row-level `user_id`). The follow-on
`auth-data-ownership-implementation-plan.md` recommended **self-built email +
magic-link + a server-side `sessions` table**, explicitly "confirm or revise
before Phase 1".

This plan revises that to **Clerk**. Rationale:

- Clerk delivers magic link / email OTP / OAuth / session management / a hosted
  user table / invitations / webhooks as a managed service — it *is* the
  "magic-link, no passwords" recommendation, without BSE owning credential
  storage, session rotation, reset flows, or breach exposure.
- The ownership model is **unchanged**: Clerk attaches a stable `userId` string
  to each request; every `user_id` column / scoping-helper / isolation-test task
  in `auth-data-ownership-implementation-plan.md` Phases 2–8 applies verbatim.
- What Clerk **removes** from that plan: the `sessions` table, any
  `magic_link_tokens` / password-hash columns, the bespoke login-email
  infrastructure, and most of its Phase 1.
- What Clerk **adds**: a third-party runtime dependency, a webhook sync path, and
  a `users` table that is a *local mirror* keyed by Clerk's string id (not a
  local `serial`).

---

## 2. Proposed architecture

```
                       ┌────────────────────────┐
                       │   Clerk (managed)      │
                       │  - hosted user store   │
                       │  - sessions / JWT      │
                       │  - magic link / OAuth  │
                       │  - invitations         │
                       └───────┬────────┬───────┘
        publishable key        │        │  secret key + webhook secret
                               │        │
      ┌────────────────────────▼──┐  ┌──▼─────────────────────────────┐
      │  BSE SPA (@clerk/clerk-   │  │  BSE API (@clerk/express)       │
      │  react)                   │  │  - clerkMiddleware()            │
      │  - <ClerkProvider>        │  │  - requireUser → req.userId     │
      │  - <SignedIn/SignedOut>   │  │  - shared scoping helper        │
      │  - <UserButton>           │  │  - POST /api/webhooks/clerk     │
      │  - getToken() → Bearer ───┼──┼──► Authorization: Bearer <jwt>  │
      └───────────────────────────┘  │  - requireAdminToken (unchanged)│
                                     └──────────────┬──────────────────┘
                                                    │
                                         ┌──────────▼──────────┐
                                         │  Neon Postgres      │
                                         │  users (mirror)     │
                                         │  <table>.user_id    │
                                         └─────────────────────┘

  Clickonomics (marketing site) ──► "Launch / Sign in" link ──► BSE /sign-in
  (no Clerk in Clickonomics for Phases 1–6; satellite-domain SSO is Phase 6+ optional)
```

Key decisions:

1. **BSE is the primary Clerk application.** One Clerk instance. Clickonomics
   gets no Clerk code until/unless it has gated content of its own — for now it
   links out to BSE's sign-in.
2. **Bearer token, not cookies, between SPA and API.** The generated client's
   `setAuthTokenGetter` seam already exists; wiring Clerk's `getToken()` into it
   touches one file, not 40+ `fetch` sites. (Re-evaluate at Phase 2 if Clerk's
   same-origin cookie handling proves simpler with the Vite dev proxy + Render
   static serving; the ownership work downstream is identical either way.)
3. **`users` is a local mirror table**, PK = Clerk user id (`text`), kept in sync
   by a Svix-verified webhook **plus** a lazy upsert on first authenticated
   request (webhooks are eventually consistent — see Migration risks).
4. **`requireAdminToken` is untouched.** Bulk/operator routes stay owner-gated
   regardless of user auth.
5. **Two-stage backend rollout:** `requireUser` lands in *report-only* mode
   (attach `req.userId`, log, do not reject, do not scope) before any table has
   `user_id`, then flips to *enforcing* once the scoping helper and migrations
   are in place.

---

## 3. Clerk auth / data-ownership sequence

Mapped onto Codex's preferred phasing. Each phase lands, verifies, and is
reviewable independently.

### Phase 0 — Discovery / doc plan  ✅ (this document)

### Phase 1 — Clerk frontend shell only (no data ownership, fully reversible)

- Add `@clerk/clerk-react` (pin exact version at implementation time; consult the
  current official Vite quickstart / the `clerk-setup` skill).
- `main.tsx`: wrap `<App/>` in `<ClerkProvider publishableKey={…}
  afterSignOutUrl="/">`.
- `App.tsx`: add `/sign-in/*` and `/sign-up/*` routes rendering `<SignIn/>` /
  `<SignUp/>`; wrap the authenticated routes in `<SignedIn>` with a `<SignedOut>`
  redirect to `/sign-in`.
- `Shell.tsx`: add `<UserButton/>` + signed-in email display.
- **No backend change. API still returns global data.** Sign-in is cosmetic
  gating only at this phase.
- Clerk dashboard: create instance, set allowed origins, sign-in/up URLs, enable
  email magic-link / OTP, set **restricted** sign-up mode (allowlist) from day
  one so Phase 1 does not accidentally expose self-serve signup.

### Phase 2 — Backend auth identity extraction (report-only)

- Add `@clerk/express`. `app.ts`: `clerkMiddleware()` before the router.
- New `middlewares/require-user.ts`: reads `getAuth(req).userId`; in **report-only
  mode** attaches `req.userId` and logs, does **not** reject unauthenticated
  requests and does **not** scope any query.
- SPA: register `setAuthTokenGetter(() => getToken())` (from Clerk `useAuth`)
  once, near `main.tsx`.
- Verify the Clerk JWT round-trips: SPA → `Authorization: Bearer` → API resolves
  a stable `userId` for Carl.
- Still no schema change; still reversible.

### Phase 3 — `users` table + `user_id` ownership model + migration plan

- **New migration `0013_users_table`:** `users ( id text primary key, email
  text, display_name text, is_owner boolean not null default false, created_at
  timestamptz not null default now() )`. No sessions/token/password columns —
  Clerk owns those.
- **New route `POST /api/webhooks/clerk`** (Svix-verified via
  `CLERK_WEBHOOK_SIGNING_SECRET`; mounted *outside* `clerkMiddleware`/`requireUser`
  and *outside* `requireAdminToken`). Handles `user.created` / `user.updated` /
  `user.deleted` → upsert/soft-handle the mirror row.
- Add a **lazy upsert**: `requireUser` ensures a `users` row exists for
  `req.userId` on first authenticated request (covers the webhook race).
- **Per-table `user_id` migrations** — follow
  `auth-data-ownership-implementation-plan.md` Phase 2 ordering exactly, with one
  change: **`user_id` is `text` referencing `users(id)`**, not an integer
  (Clerk ids are strings like `user_2ab…`). Order:
  `accessories → beans → bags → hopper_range_baselines → hoppers →
  grinders/machines (nullable) → taste_selectors (nullable) → shots (last)`.
  Each: add nullable → backfill every existing row to Carl's owner `users.id` →
  `SET NOT NULL` (except the two nullable shared-library tables), as one
  transactional migration per table with a `.down.sql`.
- **`settings` migration is its own phase-within-phase** (highest risk, per
  ADR-0009): add `user_id` → backfill → drop `UNIQUE(key)` → add
  `UNIQUE(user_id, key)` → `SET NOT NULL`, one transaction, real rollback,
  rehearsed against a disposable Neon target first.
- `airtable_sync_evidence`: stays unscoped (owner-only operational data) — no
  change, per the existing plan.
- **Owner bootstrap ordering:** Carl signs up in Clerk *first*, his real Clerk
  id is captured, his `users` row (with `is_owner = true`) is inserted, *then*
  the backfill steps run. Getting this backwards makes every existing row
  invisible.

### Phase 4 — Route-scoping helper + cross-user isolation tests (hard gate)

- Build the **shared scoping helper first**, in isolation, before touching route
  files — a thin repository/query-wrapper that takes `userId` and returns a
  pre-scoped Drizzle builder. Per-route manual `WHERE user_id = …` is the
  pattern that leaks data; do not use it.
- Flip `requireUser` from report-only to **enforcing** (reject unauthenticated
  requests to user-data routes).
- Per-route rollout in the Phase 3 table order; `dashboard.ts` / `insights.ts`
  scoped alongside `shots.ts`.
- **New `cross-user-isolation.test.ts`:** two real users, real data each, assert
  user A cannot read/update/delete user B's rows through *any* scoped route, for
  *every* owned table. **This must pass fully before any Tier 2 invite** — hard
  gate, not "should".
- Rework the existing ~89 API tests to supply a user context. Recommend a small
  internal `getUserId(req)` seam so tests stub identity without a live Clerk.
  Consider `@clerk/testing` tokens for the end-to-end path.

### Phase 5 — Frontend account / session UI

- Real sign-in page polish, account management (Clerk `<UserProfile/>` or the
  `<UserButton/>` menu), sign-out, Clerk `isLoaded`/error states, route-guard
  hardening in `App.tsx`.
- 401 handling in the generated client (redirect to `/sign-in` on token
  expiry).

### Phase 6 — Clickonomics market listing / launch link

- **Minimum viable:** add a BSE entry to `Clickonomics/app/page.tsx` — a "Launch
  BigShotEspresso" / "Sign in" CTA linking to `https://<bse-domain>/sign-in`.
  Listing metadata decided here (see §Open decisions): name, one-line, access
  state (`owner-alpha / invite-only`), pricing-tier copy (from
  `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md` — do not invent figures).
- **Optional (only if Clickonomics gains its own gated area):** promote the Clerk
  instance to multi-domain — Clickonomics as a **satellite domain** of the BSE
  primary, giving shared SSO. Not needed for a link-out.
- **Not in scope:** an actual app catalog, "install" flow, entitlement checks,
  or Clickonomics-hosted BSE. That is a separate marketplace spec.

### Phase 7 — Invite-only Tier 2 tester rollout

- Clerk **restricted mode + invitations** (or allowlist). Provision testers one
  at a time; each gets a `users` mirror row via webhook.
- Watch the isolation tests against real usage; no self-serve signup form.

### Phase 8 — Billing / public launch (later, own ADR)

- Self-serve signup, Clerk Billing or Stripe, subscription enforcement matching
  the landing-page tiers, ToS + privacy policy. Needs its own ADR — out of scope
  here.

---

## 4. Clickonomics market integration sequence

Because the marketplace does not exist yet, this is intentionally minimal and
staged behind the auth work:

1. **Now – Phase 5:** no Clickonomics change. It keeps its read-only public
   dashboard-summary tile.
2. **Phase 6a:** add a static "Launch / Sign in" CTA to the Clickonomics page
   pointing at BSE `/sign-in`. Decide and record listing metadata + access-state
   + pricing-tier copy. No shared auth.
3. **Phase 6b (optional, deferred):** if Clickonomics itself needs gated content,
   add `@clerk/clerk-react` there and register it as a **satellite domain** of
   the BSE primary Clerk instance for shared SSO. Requires
   `VITE_CLERK_PUBLISHABLE_KEY` + domain config in the Clerk dashboard.
4. **Later (separate spec):** a real catalog / entitlement / install model.
   Explicitly not designed here.

**Should auth be shared across Clickonomics and BSE?** Only once Clickonomics has
something to gate. The satellite-domain path keeps that a config change, not a
re-architecture — so building BSE as the primary now is the no-regret choice.

**Should BSE be "installable/launchable" from Clickonomics?** Launchable (a
link), yes, Phase 6a. Installable (an entitlement-gated provisioning flow), not
until a marketplace exists.

---

## 5. Required environment variables

### BSE frontend (`artifacts/coffee-log`, Vite — build-time, `VITE_` prefix)

| Var | Phase | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | 1 | Publishable (not secret). Must be present at build time on Render. |

### BSE backend (`artifacts/api-server`, Express)

| Var | Phase | Notes |
|---|---|---|
| `CLERK_SECRET_KEY` | 2 | Secret. `sync: false` in `render.yaml`. |
| `CLERK_PUBLISHABLE_KEY` | 2 | Used by `@clerk/express` for some flows; not secret. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | 3 | Secret. Svix signing secret for `/api/webhooks/clerk`. |
| `CLERK_AUTHORIZED_PARTIES` | 2 | Comma-list of allowed origins passed as `authorizedParties` to harden JWT verification against token replay from other apps. |
| `DATABASE_URL`, `ADMIN_API_TOKEN`, `CORS_ORIGIN` | — | Unchanged. |

### Clickonomics

| Var | Phase | Notes |
|---|---|---|
| *(none)* | 1–6a | Link-out needs nothing. |
| `VITE_CLERK_PUBLISHABLE_KEY` (+ satellite domain config) | 6b optional | Only if Clickonomics gains gated content. |

### Clerk dashboard configuration (not env, but required)

- Instance created; allowed origins for BSE (dev + `bigshotespresso.onrender.com`
  + any custom domain).
- Sign-in / sign-up paths set to `/sign-in`, `/sign-up`.
- Email magic-link / OTP enabled; passwords optional.
- **Sign-up restricted / allowlist mode ON** from Phase 1.
- Webhook endpoint → `https://<bse-domain>/api/webhooks/clerk`, events
  `user.created|updated|deleted`.
- Session token lifetime reviewed (default 60s JWT + refresh is fine for Bearer).

---

## 6. Required schema / API changes

Defers to `auth-data-ownership-implementation-plan.md` for the per-table detail;
the **delta introduced by choosing Clerk** is:

### Schema

| Change | Migration | Risk |
|---|---|---|
| New `users` mirror table, PK `id text` (Clerk id) | `0013_users_table` | Low (additive) |
| `user_id text references users(id)` on `accessories`, `beans`, `bags`, `hopper_range_baselines`, `hoppers`, `shots` — `NOT NULL` after backfill | `0014`–`0019` (one per table) | Medium — **`text` FK, not `integer`**; fixtures/tests must use string ids |
| `user_id text` **nullable** on `grinders`, `machines`, `taste_selectors` (shared-library path) | `0020`–`0021` | Low–medium |
| `settings`: add `user_id`, drop `UNIQUE(key)`, add `UNIQUE(user_id, key)`, `SET NOT NULL` | `0022_settings_user_scope` (own migration) | **Highest** — non-additive constraint change; rehearse on disposable Neon |
| `shot_taste_selectors` | none | ownership inherited via `shots.user_id` |
| `airtable_sync_evidence` | none | stays owner-only |

*(Migration numbers are indicative; current head is `0012`.)*

### API

| Change | Phase |
|---|---|
| `clerkMiddleware()` in `app.ts` before the router | 2 |
| `middlewares/require-user.ts` — report-only, then enforcing | 2 → 4 |
| `POST /api/webhooks/clerk` — Svix-verified, unauthenticated, outside admin gate | 3 |
| Shared scoping helper (repository/query wrapper) | 4 |
| Every user-data route uses the helper; `requireUser` enforcing | 4 |
| `requireAdminToken` + its 6 bulk routes | **unchanged** |
| Generated client: `setAuthTokenGetter(getToken)`; 401 → `/sign-in` | 2 / 5 |
| OpenAPI (`lib/api-spec/openapi.yaml`) — add the auth security scheme; regen `lib/api-zod` / `lib/api-client-react` | 2/4 |

---

## 7. Migration risks

1. **`user_id` is `text` (Clerk id), not `integer`.** The existing plan implicitly
   assumed a local `serial users.id`. Every FK, index, seed, fixture, and test
   helper must use string ids. Flagged because it is easy to write `integer`
   out of habit.
2. **`settings` compound-unique change** — unchanged from ADR-0009; still the one
   non-additive migration. Naive scoping without fixing the constraint lets one
   user's settings silently overwrite another's. Rehearse on disposable Neon.
3. **Webhook eventual consistency.** A user can present a valid Clerk JWT before
   `user.created` arrives → `req.userId` with no `users` row → FK violation on
   first write. Mitigation: lazy upsert in `requireUser`, webhook as
   reconciliation not sole source.
4. **Owner-backfill ordering.** Carl's Clerk signup + `users` row must precede
   every table backfill. A sequencing mistake, not a technical one — called out
   explicitly.
5. **Test-suite rework (~89 tests).** Most `api-contract.test.ts` cases create
   shots/bags/etc. and will need a user context. Recommend a stubbable
   `getUserId(req)` seam so the bulk of tests don't need a live Clerk;
   `@clerk/testing` for the true end-to-end path. Non-trivial, mechanical.
6. **Missed scoping clause = silent cross-user leak, not a crash.** Mitigated by
   the shared helper (Phase 4) and the isolation suite as a hard gate.
7. **Bearer-vs-cookie decision.** The generated client's own comment says the
   bearer seam is not for web apps. Chosen here anyway (fewer call-site changes,
   same-origin). If revisited, decide before Phase 2 — downstream ownership work
   is unaffected.
8. **Third-party runtime dependency.** Clerk outage = no new logins. Acceptable
   at Tier 2; note for the Phase 8 ADR. Existing owner-only `ADMIN_API_TOKEN`
   path is unaffected and remains a break-glass for operator routes.
9. **CORS / origins.** BSE stays same-origin so no CORS change for Phases 1–5.
   Clickonomics calling BSE authenticated (not planned) would need its origin in
   `CORS_ORIGIN` + `credentials`.
10. **Render build-time env.** `VITE_CLERK_PUBLISHABLE_KEY` must exist at
    *build* time, not just runtime — a Render env-group ordering gotcha.
11. **Rollback envelope.** Phases 1–2 fully reversible (remove provider +
    middleware). Phase 3+ carries schema — every migration ships its `.down.sql`
    per project rule, and the `settings` down-migration must restore
    `UNIQUE(key)`.

---

## 8. Verification strategy

- **This document:** docs-only, no build required.
- **Every code phase**, before hand-back:
  ```bash
  CI=true pnpm run typecheck
  CI=true pnpm --filter @workspace/api-server test
  CI=true pnpm run build:render
  ```
- **Phase 2:** manual — sign in on the SPA, confirm the API logs a stable
  `userId` for Carl across requests; confirm report-only mode does **not** break
  any existing unauthenticated call.
- **Phase 3:** rehearse the full migration set — especially `settings` — against
  a disposable Neon target per `docs/architecture/neon-postgres-rehearsal-plan.md`
  *before* production. After backfill, Carl signs in and confirms every existing
  bean / bag / shot / hopper / setting is visible and unchanged.
- **Phase 4:** `cross-user-isolation.test.ts` green for *every* owned table is a
  **hard gate**. Full existing suite green after its rework.
- **Phase 6:** Clickonomics build (`npm run build` in that repo) + the CTA link
  resolves to BSE `/sign-in`.
- **Phase 7:** provision one tester, confirm they see only their own data in a
  live environment before inviting the next.
- CI on `main` (secret scan, typecheck, API tests, API build, frontend build)
  green at every merge.

---

## 9. Explicit non-goals

- **No billing, payments, or subscription enforcement** in this plan (Phase 8,
  separate ADR).
- **No self-serve public sign-up.** Tier 2 is Clerk restricted/invite-only.
- **No multi-user data migration** without the per-table `user_id` plan,
  owner-first backfill, and passing isolation suite.
- **No Clickonomics marketplace / catalog / install / entitlement platform.**
  Phase 6 is a link-out (and optionally satellite-domain SSO). A real market is
  a separate spec.
- **No intelligence engines, Bluetooth / brew curves, or runtime AI assistant.**
- **No changes to Quick Log** (`QuickLog.tsx` stays shelved and unrouted).
- **No changes to `requireAdminToken`** or its 6 bulk routes.
- **No deletion** of `auth-data-ownership-implementation-plan.md` — it is
  superseded *in part* (auth mechanism only) and cross-referenced, not removed.
- **No commit, push, deploy, or production data change** to produce or execute
  Phase 0.
- **No Clerk code of any kind** until this plan and its mechanism choice
  (revising AUTH-0) are approved by Carl.

---

## 10. Recommended Agent 1 implementation prompt (Phase 1 only)

> **Task: BSE Clerk integration — Phase 1 (frontend shell only).**
> Repo: `/Users/carlenns/Documents/BigShotEspresso/Coffee-Log`, branch off `main`.
> Authorized scope: **Phase 1 of
> `docs/implementation/clickonomics-clerk-integration-plan.md` only.** Do not
> start Phase 2. Do not touch the backend, schema, migrations, or any route file.
>
> Do:
> 1. Add `@clerk/clerk-react` (pin the current stable exact version; check the
>    official Vite quickstart or the `clerk-setup` skill first).
> 2. `artifacts/coffee-log/src/main.tsx`: wrap `<App/>` in `<ClerkProvider
>    publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
>    afterSignOutUrl="/">`. Fail loudly if the key is missing.
> 3. `App.tsx`: add `/sign-in/*` and `/sign-up/*` routes (`<SignIn/>` /
>    `<SignUp/>`); wrap the existing authenticated routes so `<SignedOut>`
>    redirects to `/sign-in`. Keep the `/shots/quick` redirect and all existing
>    routes intact.
> 4. `components/layout/Shell.tsx`: add `<UserButton/>` and the signed-in email
>    in the header/nav area, matching existing styling.
> 5. Add `VITE_CLERK_PUBLISHABLE_KEY` to `artifacts/coffee-log/.env.example` (or
>    the repo's env doc) and to `docs/implementation/render-environment-checklist.md`
>    as a build-time var.
>
> Do NOT: add `@clerk/express`, any middleware, any `user_id`, any migration, any
> webhook, or wire `setAuthTokenGetter`. The API must keep returning global data.
>
> Verify: `CI=true pnpm run typecheck` and `CI=true pnpm run build:render` pass.
> Manually confirm the app redirects to a Clerk sign-in when signed out and
> renders normally when signed in (use a Clerk dev instance key).
>
> Constraints: no commit, no push, no deploy. Preserve all existing routes and
> history. Smallest safe patch.
>
> When done: **SendMessage your report to Agent 3 Planner** — files changed, what
> changed, verification output, assumptions, unresolved issues, and the exact
> recommended commit command. Do not proceed to Phase 2.

## 11. Recommended Agent 2 review prompt

> **Task: review Agent 1's BSE Clerk Phase 1 change.**
> Repo: `/Users/carlenns/Documents/BigShotEspresso/Coffee-Log`. Review the working
> tree diff against `main` (and Agent 1's report).
>
> Check:
> 1. **Scope discipline** — Phase 1 only. Flag ANY backend file, route,
>    `middlewares/`, `lib/db/`, migration, webhook, or `setAuthTokenGetter` change
>    as out of scope.
> 2. **`<ClerkProvider>`** wraps `<App/>` correctly, reads
>    `VITE_CLERK_PUBLISHABLE_KEY`, and fails loudly when absent (no silent
>    unauthenticated fallback).
> 3. **Route guard** — signed-out users cannot reach data pages; `/sign-in`,
>    `/sign-up`, and the existing `/shots/quick` redirect + all prior routes still
>    work. `wouter` `base` handling preserved.
> 4. **No secret leakage** — only the *publishable* key is client-side; nothing
>    secret in the bundle. Run the repo's secret-scan expectation.
> 5. **Styling** — `<UserButton/>` / email fit `Shell.tsx` conventions; no
>    layout regression at 390px (project a11y/mobile gate).
> 6. **Reversibility** — the change is cleanly removable (no schema, no data).
> 7. **Verification** — independently run `CI=true pnpm run typecheck` and
>    `CI=true pnpm run build:render`; confirm green. Note that `pnpm --filter
>    @workspace/api-server test` should be unaffected (no backend change).
> 8. **Docs** — env var recorded in the Render environment checklist.
>
> Output: PASS / CHANGES-REQUESTED with a specific, ordered list. Do not fix
> anything yourself. Do not commit or push.
>
> When done: **SendMessage your report to Agent 3 Planner.**

---

## Open decisions for Carl (blockers, small answers)

1. ~~**Approve Clerk as the auth mechanism**~~ — **APPROVED by Carl 2026-09-08.**
   Clerk is the authentication mechanism for BSE, revising AUTH-0 and the
   self-built magic-link recommendation in
   `auth-data-ownership-implementation-plan.md`. This approves the *mechanism
   direction only*; it is not implementation authorization — this plan as a whole
   still needs sign-off, and each phase lands under its own review.
2. **Bearer token vs. Clerk cookies** for SPA↔API (plan recommends Bearer via the
   existing client seam).
3. **BSE Clickonomics listing metadata** — display name, one-line description,
   access-state label, which pricing-tier language (if any) to show now.
4. **Tier 2 vs. Tier 3 staging** — confirm the invite-only Tier 2 milestone
   before building any Tier 3 / billing surface (this plan assumes yes).
5. **Domain plan** — is a BSE custom domain (vs. `bigshotespresso.onrender.com`)
   coming before Phase 6? Affects Clerk allowed-origins config.

## Related documentation

- [ADR-0008: Owner-Only First Release Access](../ADR/ADR-0008-owner-only-first-release-access.md)
- [ADR-0009: User Accounts, Authentication, and Data Ownership](../ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md)
- [Auth, Accounts, and Data Ownership Implementation Plan](auth-data-ownership-implementation-plan.md) — superseded *in part* (auth mechanism) by this plan
- [Launch Readiness Roadmap](launch-readiness-roadmap.md) — AUTH-0..AUTH-9 track
- [Owner-Alpha RC Report — 2026-08-28](owner-alpha-rc-report-2026-08-28.md)
- [Render Environment Checklist](render-environment-checklist.md)
- Codex handoff: `../../../HANDOFF-2026-09-08_08-57-32_CDT-clickonomics-clerk.md`
