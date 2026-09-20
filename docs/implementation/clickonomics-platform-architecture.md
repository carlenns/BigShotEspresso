# Clickonomics Platform, Marketplace, and Application Segregation

Status: **Owner-directed architecture; implementation not yet authorized**  
Recorded: 2026-09-08  
Supersedes the platform relationship and implementation sequence in
[clickonomics-clerk-integration-plan.md](clickonomics-clerk-integration-plan.md).
That earlier plan remains useful for its verified BSE schema, ownership,
migration, and isolation-test analysis.

## 1. Owner-directed product model

The current `Clickonomics/` repository is only a marketing website. That is a
verified implementation fact, not the intended product boundary.

The owner-defined direction is:

- **Clickonomics is the commercial control plane and customer front door.**
- Customers can discover applications through the Clickonomics marketplace or
  through an application's own branded domain.
- Clickonomics provides the account, authentication, subscription, billing,
  application-entitlement, and dashboard-management experience.
- BigShotEspresso and other applications remain independently deployable
  products with their own data and application logic.
- Clickonomics will also be a branded intelligence-network/dashboard product.
  It can connect authorized application data into customer dashboards without
  absorbing each application's operational database or business logic.

**Terminology:** Clerk is not the Clickonomics frontend. Clickonomics is the
frontend and control plane; Clerk is the managed identity, session, billing,
and subscription-feature provider embedded in that product.

## 2. Recommended brand and domain model

Use one domain per **customer-facing brand or product**, not one domain per
internal service.

| Surface | Recommended domain | Role |
|---|---|---|
| Clickonomics public site, marketplace, account, billing, app library, and dashboard entry | `clickonomics.ca` | Canonical Clickonomics domain and primary Clerk domain |
| Alternate Clickonomics domain | `clickonomics.im` | Redirect to the canonical domain initially; reserve for future international positioning only by an explicit later decision |
| BigShotEspresso public product site | `bigshotespresso.com` | Product discovery, documentation, and marketing |
| BigShotEspresso authenticated application | `app.bigshotespresso.com` | Independent BSE application; Clerk satellite domain |
| Clickonomics API | `api.clickonomics.ca` only if operationally needed | Control-plane API; not a public brand |
| Clickonomics dashboard workspace | Prefer a route such as `clickonomics.ca/dashboard`; use `dashboard.clickonomics.ca` only if separately deployed | Customer intelligence/dashboard surface |

Do not assign public domains to databases, queues, workers, webhook consumers,
or individual microservices. Keep those private and address them through
internal service names or private networking.

### When an app needs its own purchased domain

A separate registered domain is optional, not the default. Use these three
classes:

1. **Independent product brand:** use its own domain when customers will search
   for, discuss, buy, or trust the product independently of Clickonomics.
   BigShotEspresso qualifies, so retain `bigshotespresso.com` and use
   `app.bigshotespresso.com` for its authenticated application.
2. **Clickonomics ecosystem product:** use a route or subdomain without buying
   another domain. Examples: `clickonomics.ca/dashboard`,
   `work.clickonomics.ca`, or `intelligence.clickonomics.ca` if those surfaces
   are independently deployed. An IATSE work tracker can begin this way and
   receive its own domain later only if it becomes a standalone brand.
3. **Internal platform service:** use no public customer-facing domain.
   Databases, queues, workers, webhook handlers, connector services, and
   internal APIs should remain private wherever possible.

Prefer a **route** when the capability is part of the same Clickonomics product,
navigation, release cycle, and security boundary. Prefer a **subdomain** when it
needs an independent deployment, runtime, outage boundary, or application
security policy. Purchase a separate domain only when the product needs a truly
independent public identity or when a later branding/legal decision requires
it.

The initial recommendation is therefore:

- `clickonomics.ca` — public site, marketplace, account, subscriptions, and
  billing;
- `clickonomics.ca/dashboard` — dashboard sales/service entry and customer
  dashboard library, unless a separate deployment later justifies
  `dashboard.clickonomics.ca`;
- `work.clickonomics.ca` — a Clickonomics-native work tracker if it needs its
  own deployment;
- `bigshotespresso.com` and `app.bigshotespresso.com` — independent BSE brand;
- no new purchased domains for experimental ecosystem apps.

### Dual discovery

Both discovery paths are intentional:

1. **Marketplace-led:** customer discovers an app on `clickonomics.ca`, signs in
   or subscribes, then launches it.
2. **Product-led:** customer discovers `bigshotespresso.com`, chooses a plan or
   signs in, and is routed through the canonical Clickonomics account/checkout
   flow with the BSE product and safe return URL identified.

Both paths create or use the same Clerk identity and the same entitlement. They
must not create separate BSE and Clickonomics customer accounts.

## 3. Platform boundaries

```text
Clickonomics control plane
  account + marketplace + billing + entitlements + dashboard catalogue
                         |
              Clerk identity / subscription
                         |
       +-----------------+------------------+
       |                                    |
BigShotEspresso                         Other apps
own deployment                          own deployment
own operational data                    own operational data
own API authorization                   own API authorization
       |                                    |
       +---------- scoped connectors -------+
                         |
              Clickonomics dashboards
       normalized read models + provenance
```

### Clickonomics owns

- Customer identity and account experience.
- Subscription catalogue and billing-management experience.
- Product/application catalogue.
- Entitlement projection: which account can use which product and feature.
- Customer dashboard definitions, connector grants, refresh status, and
  presentation.
- Cross-application audit records for launches, grants, revocations, and data
  refreshes.

### Each application owns

- Its operational data and domain model.
- Its application-specific authorization and record ownership.
- Its deployment, monitoring, recovery, and rollback.
- Its API contract for explicitly authorized Clickonomics integration.
- Enforcement of the relevant subscription feature on the backend.

Clickonomics showing or hiding an app tile is not a security boundary. A user
can navigate directly to an application domain, so every application backend
must independently verify:

1. a valid Clerk session;
2. the required product/feature entitlement; and
3. ownership or authorized workspace access to the requested data.

## 4. Identity, tenancy, and billing

### Clerk topology

- Use one production Clerk application with `clickonomics.ca` as the primary
  domain.
- Add `app.bigshotespresso.com` as a satellite domain so sign-in and sign-up
  remain canonical at Clickonomics while the BSE brand remains independent.
- Restrict allowed redirect origins and authorized parties to the exact
  production and approved development origins.
- Prefer Clerk's same-origin session cookie when a frontend calls its own
  same-origin API. Use an Authorization bearer token only for an intentional
  cross-origin API request.

### Personal accounts and organizations

- Consumer applications such as BSE can begin with personal accounts.
- Business dashboards should use a workspace/organization boundary when more
  than one person can access the same business data.
- Do not force every consumer into an organization solely to make the schema
  uniform.
- Application rows should carry the correct owning subject: personal
  `clerk_user_id`, organization/workspace id, or both where membership is
  relevant. This choice must be explicit per application.

### Subscription and entitlement model

- Define stable product/feature keys, for example `bigshot_espresso`,
  `clickonomics_dashboards`, or `bid_bot`.
- Clerk Billing may manage plans and feature membership, but each backend must
  enforce the feature it requires.
- Maintain a local, auditable projection of customer, subscription, and
  entitlement events needed for operations and support.
- Verify webhook signatures and make handlers idempotent.
- Do not make first-use onboarding depend on a webhook arriving immediately;
  webhook delivery is asynchronous. Reconcile from the authenticated session
  or provider API when current access must be established synchronously.
- Define a deliberate grace policy for temporary billing or webhook-provider
  failures; do not accidentally revoke a paying customer's working access on a
  transient integration error.

## 5. Clickonomics intelligence-network segregation

The intelligence/dashboard product should be a **separate platform capability**
inside Clickonomics, not a privileged process with unrestricted access to every
application database.

Recommended integration pattern:

1. Each application publishes a narrow, versioned integration API or event
   contract containing only approved fields.
2. A customer or workspace explicitly grants Clickonomics access to that
   application and chooses the permitted data scope.
3. Clickonomics ingests or queries through a scoped connector identity.
4. The dashboard layer stores normalized read models, refresh metadata, source
   provenance, and calculation versions.
5. Dashboard actions that mutate an application require a separately approved,
   narrow command API, preview/confirmation where appropriate, and an audit
   record. Read access must not silently become write access.

This produces three useful security boundaries:

- **Operational application data plane:** source records and business rules.
- **Clickonomics control plane:** identity, billing, entitlements, connector
  grants, and catalogue.
- **Dashboard intelligence plane:** derived read models, metrics, provenance,
  and presentation.

An outage or deployment in one application should not take down the
Clickonomics account portal or unrelated applications. A dashboard connector
failure should show stale/unavailable source status, not fabricate current
values or corrupt the source application.

## 6. Recommended implementation sequence

1. **Platform contract and domain decision** — accept this architecture,
   designate `clickonomics.ca` canonical, and define redirect behaviour for
   `clickonomics.im`.
2. **Clickonomics account shell** — integrate Clerk authentication into
   Clickonomics with no billing and no application data migration.
3. **Catalogue and entitlement vocabulary** — define products, stable feature
   keys, launch URLs, return URLs, access states, and ownership of listing
   metadata.
4. **Subscription pilot** — configure one invite-only/test plan and verify
   checkout, cancellation, feature checks, webhook signatures, idempotency,
   reconciliation, and support visibility.
5. **Federated application reference** — integrate exactly one application as
   the reusable reference pattern.
6. **BSE ownership migration** — use the table-by-table migration and
   cross-user isolation gates preserved in the earlier plan. Existing BSE data
   must be backfilled only after the owner's real Clerk identity exists.
7. **BSE branded-domain federation** — configure
   `app.bigshotespresso.com` as a satellite, enforce BSE entitlement on the API,
   and verify both marketplace-led and product-led login/checkout/return flows.
8. **Dashboard connector pilot** — one read-only, explicitly scoped connector;
   record provenance and staleness. No cross-app write capability.
9. **Additional applications** — reuse the reference contract; do not create a
   bespoke authentication or billing model for each app.
10. **Public launch** — only after recovery, isolation, entitlement, billing,
    direct-URL, domain/redirect, and cross-application outage tests pass.

## 7. Reliability and security gates

- Direct navigation to an app without entitlement is rejected by its backend.
- User A cannot read, change, or infer User B's application data.
- Organization A cannot access Organization B's dashboards or connector data.
- Duplicate or reordered webhooks do not duplicate grants or corrupt state.
- A delayed webhook does not strand a newly paid customer.
- A cancelled subscription follows the documented grace/revocation policy.
- Clickonomics outage behaviour and individual-app outage behaviour are tested
  separately.
- Connector failures disclose last-successful refresh and stale status.
- Backups and restoration are tested for each authoritative datastore.
- Domain redirects, Clerk callback URLs, authorized parties, CSP, and secret
  separation are verified in production configuration.

## 8. Explicit non-goals for the first implementation

- No unbounded marketplace/plugin installation framework.
- No common database shared directly by every application.
- No unrestricted Clickonomics access to application databases.
- No cross-application write automation in the first dashboard connector.
- No separate login account per product.
- No public domain per internal service.
- No BSE ownership migration until its migration rehearsal and isolation suite
  are ready.
- No commit, push, deployment, production Clerk configuration, billing launch,
  or production-data change is authorized by this document.

## 9. Decisions still requiring owner approval

1. Confirm `clickonomics.ca` as the canonical Clickonomics domain and
   `clickonomics.im` as an initial redirect.
2. Choose the first reference application for federation.
3. Decide whether the first Clickonomics dashboard customers are personal
   accounts, organization workspaces, or both.
4. Approve the first product/feature vocabulary and invite-only test plan before
   configuring live billing.
