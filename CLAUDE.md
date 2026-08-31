# Claude instructions for BigShotEspresso / Coffee-Log

Start with `docs/START_HERE.md` and follow only the relevant portion of its
reading order. The user's current task controls scope; this file does not
authorize implementation.

## Current priority

Continue owner-alpha and post-RC cleanup. Do not start large new feature tracks,
public-launch work, accounts/auth, payments, live Airtable sync, or intelligence
engines unless explicitly requested and approved through project governance.

## Rules

- Preserve existing user and agent work and meaningful history.
- Do not invent selectors, formulas, thresholds, relationships, fields, or
  engine behavior.
- PostgreSQL/Neon is operational authority; CSV/Airtable material remains
  preserved research and migration evidence.
- Use Initial Grinder Output rather than corrected Dose for natural
  grinder-output consistency analysis.
- Keep retrospective comparisons descriptive, not causal.
- No destructive Git commands.
- No commit, push, merge, tag, or deploy unless explicitly requested.
- Run typecheck, API tests, and the Render build before committing code changes.

## Efficient task format

Read only the named files and direct dependencies. Make the smallest safe patch.
Return outcome, files changed, verification, assumptions, unresolved issues, and
the safest next step. If context gets tight, stop and provide status plus the
current diff.

