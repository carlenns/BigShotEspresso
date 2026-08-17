# Domain Setup Checklist

> **Status:** Draft domain checklist  
> **Created:** 2026-08-17  
> **Target:** User-owned domain for Coffee Log / BigShotEspresso release  
> **Boundary:** Documentation only. This does not modify DNS records or deploy the app.

## Purpose

This checklist prepares the custom domain for the first Coffee Log release.

The domain should point to the app host. The app host should connect to Neon Postgres. DNS should not contain secrets.

## Target Shape

```text
Domain / subdomain
  → Render service
    → Neon Postgres
```

## Domain Decision Needed

Before DNS setup, choose:

| Option | Example | Use |
| --- | --- | --- |
| Root domain | `bigshotespresso.com` | Main public site/app |
| App subdomain | `app.bigshotespresso.com` | Best if root may later become marketing site |
| Admin subdomain | `admin.bigshotespresso.com` | Only if admin app is separately protected |

Recommended first setup:

```text
app.<your-domain>
```

Reason:

- Keeps the root domain available for a future marketing/waitlist/home page.
- Makes it clear that this is the application.

## DNS Requirements

The exact records depend on Render’s custom-domain instructions at setup time.

Common possibilities:

- CNAME for a subdomain.
- A/ALIAS/ANAME records for a root domain.
- Domain verification record if required.

Do not invent DNS records before Render provides the target values.

## Security Rules

- DNS records should never contain application secrets.
- Do not put database connection strings in DNS.
- Do not put Airtable tokens in DNS.
- Do not expose admin URLs unless access control exists.
- Keep screenshots of DNS values out of public docs if they reveal account metadata.

## Pre-Domain Requirements

Before pointing the domain:

- Render service deploys successfully.
- Render URL smoke test passes.
- Neon database target is correct.
- Security checklist passes or has accepted exceptions.
- Admin/destructive routes are protected or not deployed.
- HTTPS/TLS is active on the Render URL or custom domain path.

## Domain Smoke Test

After DNS is configured:

- Domain resolves.
- HTTPS works.
- App loads.
- API routes work.
- Dashboard loads.
- No mixed-content warnings.
- No secret values visible in browser.
- Wrong-domain redirects, if any, behave as expected.

## Release Blockers

Do not publish/share the domain if:

- The app points to rehearsal data by mistake.
- Admin/destructive routes are public.
- HTTPS is not working.
- Database connection is unstable.
- CI or production build is failing.
- The release candidate has not been approved.

## Current Recommendation

Use a subdomain for the app first.

Keep the root domain free for a future landing page, product explanation, documentation, or waitlist.
