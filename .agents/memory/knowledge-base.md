---
name: BigShotEspresso Knowledge Base
description: Product vision, dashboard philosophy, and AI onboarding strategy — highest-priority source of truth for all feature decisions.
---

## Rule
All future features, dashboards, AI integration, onboarding, and reporting must align with the three documents in `BigShotEspresso/knowledge/`. If a feature conflicts with these docs, follow the docs.

## PROJECT_VISION.md — core truths

- Tagline: **Find your best shot. Repeat it.**
- Mission: Help home baristas make the coffee they actually want to drink.
- BigShotEspresso is a **coffee improvement platform**, not just a logger.
- Every feature must pass the **BigShotEspresso Test**: *Does this help the user find their best shot and repeat it?*
- Features exist to help users: dial in faster, waste less coffee, reproduce successful shots, understand preferences, discover patterns.

**Why:** The distinction between "records what happened" vs "helps understand why and how to repeat it" defines every product decision. Features that only log data without helping the user improve fail the test.

## DASHBOARD_INTELLIGENCE.md — dashboard requirements

The dashboard is a **coffee control center**, not a stats page. It must answer: *Does this help the user make better coffee today?*

Required sections (in priority order):
1. **Current Baseline** — active bag, dose, yield, temp, grind setting, grind time
2. **Current Bag Intelligence** — bag open days, reference shot count, avg rating, best yield range, best first pour range
3. **Grind Drift Intelligence** — compare current bag to previous bags
4. **Next Shot Watchlist** — concise actionable guidance for the next pull

**Why:** The dashboard spec explicitly defines what "intelligence" means — it's actionable, bag-aware, and drift-aware, not just aggregate stats. Any dashboard redesign must include all four sections.

## AI_ONBOARDING_STRATEGY.md — AI integration philosophy

- Division of responsibility: **BigShotEspresso stores the data. The AI helps users understand the data.**
- The AI is external (ChatGPT, Claude, Gemini, local) — not embedded in the app.
- Onboarding flow: account → equipment → beans/bags/shots → create AI project → upload Knowledge Base → paste instructions → upload exports.
- The app must support this by producing exportable, AI-readable outputs (knowledge base files, export formats).

**How to apply:** Any "AI feature" in the app should be about producing good exports and context files, not embedding an LLM. The AI guidance lives outside the app in the user's chosen AI tool. Do not add in-app AI chat that conflicts with this architecture.
