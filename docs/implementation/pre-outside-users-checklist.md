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
| ADR-0011 "Still open" owner decisions (canonical domain, first reference app, personal vs org, product vocabulary) | Carl | Decision | ADR-0011 |

## W1 Owner decisions
| Item | Owner | Status | Source |
|---|---|---|---|
| EQ-1 equipment defaults Option A | Carl | Done (approved 2026-09-28, Phase 2A S5) | phase-2a-scope-authorization |
| EQ-2 decaf/pour-over defaults | Carl | Decision (deferred in 2A) | RC report |
| TS-1 taste-selector archive slice | Carl | Decision | RC report |
| DI-4 corpus rules backfill | Carl | Partly decided (three flagged shots, 2026-09-29); broader backfill not rechecked | completed-tasks |
| Testers may import CSV / connect Airtable | Carl | Decision (recommended: no for both) | route-exposure-audit |

## W2 App housekeeping
| Item | Status |
|---|---|
| GRD-1 grind precision follows selected grinder | Done (Phase 2A S4) |
| DI-3 accessory delete guard, EQ-5 inert equipment settings | Done (commit 2f23c02) |
| PL-1, PL-2, PL-3, PL-4, PL-6 | Done (Phase 2A S1) |
| PL-5, PL-7, PL-8 | Not re-verified (PL-7 bottom nav since replaced by the swipeable bar, 2026-09-30) |
| DI-5 / TS-1 taste-selector archive model | Open (needs TS-1 decision) |
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
| Prisma Free vs Starter (backups, connections) | Carl | Decision |
| Render free plan spins down; paid instance | Carl | Decision |
| First scheduled Sunday backup (2026-10-04) present locally and in Drive | Claude/Carl | Open |
| Error and uptime monitoring with an alert path | Claude/Carl | Open |
| `domain-setup-checklist.md` for app.bigshotespresso.com | Carl | Open (no DNS change without Carl) |
| Supersession notes on Neon-era docs (neon-backup-restore-runbook, RC report section 9, security checklist item 4) | Claude | Open |

## W5 Security hardening (auth-independent)
| Item | Status |
|---|---|
| Fresh secret scan (tracked and untracked) | Open |
| Dependency audit (`pnpm audit`) | Open |
| Frontend bundle exposes no secrets | Open |
| Content Security Policy | Open (none in `app.ts`) |
| Rate limiting / abuse protection | Open (none in `app.ts`) |
| Admin/destructive route review | Open |

## W6 Product and legal
| Item | Owner | Status |
|---|---|---|
| Privacy policy draft | Claude drafts, Carl reviews | Open (none exists) |
| Terms of service draft | Claude drafts, Carl reviews | Open (none exists) |
| Beta onboarding copy and tester expectations | Claude/Carl | Open |
| Support / feedback path | Carl | Decision |

## W7 Auth-readiness documents
| Item | Status |
|---|---|
| Update auth-data-ownership-implementation-plan for Clerk, text `user_id`, three checks | Open |
| Cross-user isolation test specification (hard gate before any invite) | Open |
| Route-by-route scoping inventory | Open |
| Migration rehearsal plan (backup, throwaway Prisma database, rollback; `settings` key to `(user_id, key)`) | Open |

## Exit criteria
All W0 to W7 items Done or explicitly accepted by Carl; then BSE waits on Clickonomics platform steps 2 to 5
(ADR-0011) before the BSE ownership migration begins.
