# Prompt Governance

Prompts are instructions and provenance artifacts, not architecture authority.

## Rules

- Prompts must begin by directing the agent to read [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md).
- Prompts must identify the authorized phase and explicit stop condition.
- Prompts cannot invent selectors, formulas, thresholds, or relationships.
- Prompts cannot silently supersede approved architecture or ADRs.
- Completion prompts must require evidence and documentation updates.
- Historical prompts are preserved and marked superseded when replaced.

## Current prompt sources

The parent workspace contains onboarding and blueprint documents registered in [2026 History](../HISTORY/2026/README.md). They remain preserved in place.

No reusable canonical implementation prompt has yet been adopted inside this directory.
