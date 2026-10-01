# Pre-Outside-Users Checklist

Created: 2026-10-01 · Governs: [Phase 2B](phase-2b-scope-authorization.md) · Authorizes nothing by itself.
Status key: Done · Open · Decision (Carl) · Not re-verified (listed in an older doc; status not rechecked 2026-10-01).

## W0 Governance
| Item | Owner | Status | Source |
|---|---|---|---|
| ADR-0009 amended and accepted (design direction) | Carl | Done 2026-10-01 | ADR-0009 |
| ADR-0011 Clickonomics platform + Clerk | Carl | Done 2026-10-01 | ADR-0011 |
| ROADMAP and START_HERE updated | Claude | Done 2026-10-01 | ROADMAP |
| Phase 2B authorization | Carl | Done 2026-10-01 | phase-2b-scope-authorization |
| ADR-0011 "Still open" owner decisions (canonical domain, first reference app, personal vs org, product vocabulary) | Carl | Decision (not decided yet) | ADR-0011 |

## W1 Owner decisions
| Item | Owner | Status | Source |
|---|---|---|---|
| EQ-1 equipment defaults Option A | Carl | Done (approved 2026-09-28, Phase 2A S5) | phase-2a-scope-authorization |
| EQ-2 decaf/pour-over defaults | Carl | Done: keep them as base default fields (Carl, 2026-10-01); no change needed | RC report |
| TS-1 taste-selector archive slice | Carl | Done: approved 2026-10-01, and already built (migration 0013, archive/restore routes, Taste Selectors page); the RC report was stale | RC report |
| DI-4 corpus rules backfill | Carl | Partly decided (three flagged shots, 2026-09-29); broader backfill not rechecked | completed-tasks |
| Testers may import CSV / connect Airtable | Carl | Done: no for both (Carl, 2026-10-01); both stay owner/admin-token tools | route-exposure-audit |

## W2 App housekeeping
| Item | Status |
|---|---|
| GRD-1 grind precision follows selected grinder | Done (Phase 2A S4) |
| DI-3 accessory delete guard, EQ-5 inert equipment settings | Done (commit 2f23c02) |
| PL-1, PL-2, PL-3, PL-4, PL-6 | Done (Phase 2A S1) |
| PL-5, PL-7, PL-8 | Not re-verified (PL-7 bottom nav since replaced by the swipeable bar, 2026-09-30) |
| DI-5 / TS-1 taste-selector archive model | Done (already built; see TS-1) |
| Empty-string values in Bag #5 and shot #20 | Not re-verified |
| Days Since Open off-by-one around late-night entries | Not re-verified |
| GRD-2 timed-dosing, SC-1..3 | Deferred (not needed for beta) |

## W3 Verification
| Item | Status |
|---|---|
| One continuous browser lifecycle walkthrough (bean to Dashboard) | Open (launch audit Critical Blocker #2 remainder) |
| Render smoke test on the Prisma-backed service | Partly done at cutover 2026-09-28 (healthz, Dashboard, test shot); full checklist not rerun |
| Swipeable bottom nav on real phones | Done by Carl 2026-09-30 ("that is better") |

## W4 Operations
| Item | Owner | Status |
|---|---|---|
| Prisma Free vs Starter (backups, connections) | Carl | Decided 2026-10-01: stay on Free for now. Risk accepted: no provider backups (weekly dumps to Drive are the only backup), few connections; revisit before real tester data |
| Render free plan spins down; paid instance | Carl | Decided 2026-10-01: stay on Free for now. Risk accepted: first request after idle is slow; revisit before testers |
| First scheduled Sunday backup (2026-10-04) present locally and in Drive | Claude/Carl | Open |
| Error and uptime monitoring with an alert path | Claude/Carl | Open |
| `domain-setup-checklist.md` for app.bigshotespresso.com | Carl | Open (no DNS change without Carl) |
| Supersession notes on Neon-era docs (neon-backup-restore-runbook, RC report section 9, security checklist item 4) | Claude | Done 2026-10-01 |

## W5 Security hardening (auth-independent)
| Item | Status |
|---|---|
| Fresh secret scan (tracked, untracked, full history) | Done 2026-10-01: files clean; **legacy Airtable token found in old history on a public branch; Carl to revoke it in Airtable** |
| Dependency audit (`pnpm audit`) | Done 2026-10-01: 4 advisories fixed by pinning `qs` and `body-parser`; now clean |
| Frontend bundle exposes no secrets | Done 2026-10-01: clean |
| Content Security Policy | Done 2026-10-01 (code, tests, Chrome check); not yet deployed |
| Rate limiting / abuse protection | Done 2026-10-01 (code and tests); not yet deployed |
| Admin/destructive route review | Done 2026-10-01: `/api/airtable/test` now admin-gated; admin routes rate limited |

## W6 Product and legal
| Item | Owner | Status |
|---|---|---|
| Privacy policy draft | Claude drafts, Carl reviews | Drafted 2026-10-01 ([draft](../product/BSE_PRIVACY_POLICY_DRAFT.md)); awaiting Carl, then a qualified reviewer |
| Terms of service draft | Claude drafts, Carl reviews | Drafted 2026-10-01 ([draft](../product/BSE_TERMS_OF_SERVICE_DRAFT.md)); awaiting Carl, then a qualified reviewer |
| Beta onboarding copy and tester expectations | Claude/Carl | Drafted 2026-10-01 ([draft](../product/BSE_BETA_TESTER_ONBOARDING_DRAFT.md)); awaiting Carl |
| Support / feedback path | Carl | Decision (not decided yet) |

## W7 Auth-readiness documents (deferred by Carl 2026-10-01 until the housekeeping is done)
| Item | Status |
|---|---|
| Update auth-data-ownership-implementation-plan for Clerk, text `user_id`, three checks | Open |
| Cross-user isolation test specification (hard gate before any invite) | Open |
| Route-by-route scoping inventory | Open |
| Migration rehearsal plan (backup, throwaway Prisma database, rollback; `settings` key to `(user_id, key)`) | Open |

## Exit criteria
All W0 to W7 items Done or explicitly accepted by Carl; then BSE waits on Clickonomics platform steps 2 to 5
(ADR-0011) before the BSE ownership migration begins.
