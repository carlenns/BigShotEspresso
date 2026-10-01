# BigShotEspresso Privacy Policy — DRAFT

> **Status:** Draft for Carl's review, 2026-10-01. **Not legal advice and not published.** Items marked **[DECISION]** or **[TBD]**
> need Carl's input. Have a qualified person review it before any outside user sees it. It describes the product as built
> and planned (Phase 2B); it must be re-checked when login, billing or any new data use is added.

> **Do not publish or send until per-user data ownership exists.** Statements that other users cannot see your records are only true
> once the accounts and ownership work (ADR-0009, ADR-0011) is built and the cross-user isolation tests pass. Today BSE is owner-only.

**Effective date:** [TBD] · **Operator:** [TBD: legal name of the person or company operating BigShotEspresso, and contact address]
· **Contact for privacy questions:** [TBD: email]

## 1. What this covers

BigShotEspresso ("BSE") is a coffee logging app: you record espresso shots, beans, bags, equipment and taste notes, and the app
shows you your own patterns. This policy explains what we collect, why, who handles it, and your choices. During the private
beta, access is by invitation only.

## 2. What we collect

| Category | Examples | Why |
| --- | --- | --- |
| Account details (when login is added) | Email address, name if you give one, a sign-in identifier | To let you sign in and to keep your data separate from other users' |
| Your coffee records | Shots (dose, yield, times, grinder setting, ratings, notes, taste selections), beans, bags, equipment, settings | To provide the app; this is the core of what you create |
| Technical data | IP address, browser type, request logs (URL path and status, not request contents) | To keep the service running, find errors and prevent abuse |
| Feedback you send us | Messages, screenshots you choose to share | To fix problems and improve the app |

We do **not** knowingly collect payment details during the beta (there is no billing yet), precise location, contacts, or
anything from your device beyond what a normal web request contains. We do not use advertising or analytics trackers.
**[DECISION]** confirm no analytics tool will be added for the beta; if one is, list it here.

## 3. Who handles your data

| Provider | Role | Where |
| --- | --- | --- |
| Render | Hosts the app and API | United States (Ohio) |
| Prisma Postgres | Stores your records | United States (N. Virginia) |
| Clerk (planned) | Sign-in and sessions | [TBD: confirm region and data processing terms] |
| Google Fonts | Delivers the Inter and Fraunces fonts; your browser contacts Google when the page loads, which shares your IP address with Google | United States |

**[DECISION]** To avoid the Google Fonts request, the fonts could be served from BSE itself. This would remove Google from this list.

Your data is therefore stored and processed in the United States even if you live elsewhere. **[TBD]** state the legal basis and
cross-border wording required for your users' regions (for example Canadian privacy law); a reviewer should write this section.

## 4. How we use it

To run and secure the service, show you your own records and statistics, answer your messages, and fix bugs. We do **not** sell
your data, share it for advertising, or use your personal records to train AI models. We do not combine one user's records with
another's. **[DECISION]** BSE's long-term research ideas (shared, de-identified patterns across users) are **not** enabled; if you
ever want them, they need a separate opt-in and a policy update first.

## 5. Keeping it safe

Data is encrypted in transit (HTTPS). Access to the database and admin functions is restricted to the operator. Requests are
rate limited. Backups are taken weekly and kept in the operator's private storage. No system is perfectly secure; if a breach
affects you we will tell you promptly and as the law requires. **[TBD]** retention period for backups.

## 6. Your choices

You can ask us to **export** your records, **correct** them, or **delete** your account and all its records. **[DECISION]** whether
self-service export and delete exist at launch or are handled by email within [TBD] days. Deleted data may persist in backups
until they are replaced (**[TBD]** period).

## 7. Cookies and similar technology

BSE does not use advertising cookies. When login is added, the sign-in provider sets the cookies needed to keep you signed in.
Your browser may also store local preferences. **[TBD]** list exact cookies once Clerk is integrated.

## 8. Children

BSE is not directed at children. **[TBD]** minimum age (commonly 16 or 18; a reviewer should confirm).

## 9. Changes

We will update this policy when the product changes and tell beta users before material changes take effect.
