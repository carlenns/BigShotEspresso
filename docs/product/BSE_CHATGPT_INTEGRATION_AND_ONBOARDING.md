# BigShotEspresso ChatGPT Integration and Onboarding Strategy

> **Status:** Product guidance; not an implementation authorization  
> **Authority:** Subordinate to the [Project Constitution](../PROJECT_CONSTITUTION.md), approved Architecture Decision Records, current architecture documentation, and the [Master Development Roadmap](../ROADMAP.md)  
> **Scope:** Product boundaries, onboarding, cost control, data quality, privacy, and staged integration guidance

For the subscription-price and scaling-cost analysis that supports this strategy, see the [Subscriber Feasibility Study](BSE_SUBSCRIBER_FEASIBILITY.md).

## Executive decision

BigShotEspresso (BSE) is the structured espresso platform. It owns the durable domain model, operational workflows, evidence, provenance, deterministic calculations, and explainable research outputs.

ChatGPT is an optional, user-provided conversational layer. A user may connect ChatGPT to approved BSE data and actions to receive onboarding, education, scientific logging guidance, interpretation, and help completing supported workflows. This does not make ChatGPT the system of record, does not transfer BSE governance to ChatGPT, and does not create a new BSE intelligence engine.

The intended commercial model is bring your own ChatGPT account or subscription. BSE should minimize company-funded, server-side AI inference and recurring AI automations unless a later, approved business case demonstrates that they are necessary, safe, measurable, and economically sustainable.

## Product boundary

### BigShotEspresso is responsible for

- Structured records for equipment, beans, bags, hopper state, shots, sensory observations, and related provenance.
- Validations, controlled vocabularies, relationships, eligibility rules, and deterministic calculations.
- Operational application workflows backed by PostgreSQL.
- Research authoring and knowledge authority in Airtable, with synchronization governed by existing project architecture.
- Evidence-backed analytical outputs implemented only in the order and under the approval gates established by the roadmap.
- Stable, permissioned interfaces through which an approved external assistant can retrieve context or request supported actions.

### ChatGPT may provide

- Conversational onboarding tailored to a user's equipment, experience, and goals.
- Plain-language education about espresso variables and the purpose of BSE fields.
- Step-by-step scientific logging guidance before, during, and after a shot.
- Clarifying questions that help users record observations without silently filling gaps.
- Interpretation of BSE-provided records and approved analytical outputs.
- Drafted or initiated actions through a BSE app/connector, subject to authorization, validation, and confirmation.

### ChatGPT must not become

- The authoritative store for BSE records or research conclusions.
- A replacement for deterministic calculations that BSE can perform reliably.
- An ungoverned source of selectors, formulas, thresholds, causal claims, or recommendations.
- A newly invented formal intelligence engine outside the approved roadmap.
- A way to bypass BSE permissions, validation, provenance, synchronization, or audit requirements.

## ChatGPT subscription and OpenAI API billing

A ChatGPT subscription and OpenAI API usage are separate products with separate billing. A paid ChatGPT plan does not automatically fund API calls made by BSE, and an API account does not replace a user's ChatGPT subscription.

The default product strategy therefore assumes:

1. The user obtains and manages any ChatGPT plan needed for the desired app/connector capabilities.
2. The user connects ChatGPT to BSE through an approved integration when available.
3. BSE does not proxy ordinary conversational usage through a company-paid OpenAI API account.
4. Any future BSE-funded API feature requires explicit product approval, metering, budgets, abuse controls, privacy review, and a sustainable pricing model.

Plan availability, limits, regional availability, app capabilities, and OpenAI product naming may change. User-facing onboarding must link to current official OpenAI documentation rather than hard-code plan promises. See [OpenAI's ChatGPT and API billing guidance](https://help.openai.com/en/articles/9039756-managing-billing-settings-on-chatgpt-web-and-platform) and [Apps in ChatGPT](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt).

## Standardized scientific logging

BSE should teach users to log observations as a repeatable experiment while remaining practical for everyday espresso.

### Core method

- Identify the question being tested, such as hopper state, grind setting, bean age, or workflow timing.
- Record the actual values observed; never substitute targets for measurements.
- Keep actual basket dose distinct from initial grinder output and any top-up, removal, spill, or redistribution loss.
- Capture timestamps and session context so cold-start, rested, and back-to-back conditions can be separated.
- Record mechanical conditions before attributing variation to operator inconsistency.
- Preserve faults, interruptions, and unusual shots as evidence, while using explicit eligibility fields to control serious analysis.
- Separate sensory observations from mechanical measurements and capture taste evolution as the shot cools when useful.
- Change one important variable at a time when the user's goal is causal learning, while still supporting real-world multi-variable sessions.
- Mark unknowns as unknown; do not infer missing measurements or selector values.

### Data-quality benefits

Consistent definitions and guided capture produce records that are more comparable across time, bags, equipment, and users. This improves:

- Completeness and field-level validity.
- Separation of measured, calculated, inferred, and subjective data.
- Detection of confounding factors such as hopper depletion, retention exchange, temperature state, bean aging, and workflow interruption.
- Reproducibility of successful shots.
- Confidence calibration through usable sample counts and comparable conditions.
- The quality of later BSE intelligence without changing its approval requirements.

ChatGPT can explain the protocol and ask context-sensitive questions, but BSE must enforce the canonical schema and validation rules.

## Citizen science and community research

Standardized logging can eventually support an opt-in community research dataset. The opportunity is not simply a larger pool of shot records; it is a pool of records with shared definitions, known provenance, comparable conditions, and explicit analytical eligibility.

Potential future uses include:

- Comparing grinder behavior across hopper states and equipment configurations.
- Studying bag-aging and roast-density patterns.
- Identifying repeatable operating windows and exception cases.
- Producing anonymized aggregate findings with visible sample sizes and limitations.

Community participation must be voluntary and separate from core product use. Before launch, BSE requires approved consent language, contribution and withdrawal rules, de-identification standards, minimum cohort protections, data-quality criteria, research governance, and a policy for publication or commercial use. Cross-user correlation must not be presented as causation.

## Onboarding flow

### 1. Establish the BSE account and research context

The user creates a BSE account, reviews the data and privacy model, and identifies their experience level and goals. BSE explains that it stores the durable record; ChatGPT is optional assistance.

### 2. Configure equipment and defaults

The user records the machine, grinder, basket conventions, and other approved defaults. BSE validates these fields. The assistant may explain them, but must not invent unknown specifications.

### 3. Teach the minimum viable logging protocol

Use a short guided example to distinguish initial output, actual basket dose, corrections, yield, timing, faults, and sensory notes. Explain why timestamps, hopper state, and cooling observations matter.

### 4. Log a first guided shot

ChatGPT can gather observations conversationally and prepare a complete proposed record. The user reviews any assumptions, calculations, and unknowns before a supported write. BSE performs final validation and returns the stored and calculated result.

### 5. Connect ChatGPT optionally

If an approved BSE app/connector is available, the user authenticates directly and grants the smallest useful permissions. Onboarding explains which data ChatGPT can retrieve and which actions it can request.

### 6. Deliver an early evidence-backed insight

After sufficient eligible data exists, BSE supplies a small, explainable result—for example, a comparable historical shot or a detected logging gap. Sparse evidence must produce “insufficient evidence,” not a fabricated recommendation.

### 7. Introduce advanced research progressively

Hopper mechanics, lifecycle analysis, exception analysis, prediction, and community contribution appear only when the roadmap, evidence, and user readiness support them.

## Implementation guidance

### Integration shape

- Expose a narrow, versioned BSE integration surface rather than direct database or Airtable access.
- Keep PostgreSQL as the operational app database and Airtable as research authoring authority, according to existing synchronization governance.
- Prefer read-only tools first: current setup, active bag context, recent eligible shots, field definitions, and approved analytical outputs.
- Add writes only as explicit, validated actions such as proposing or creating a shot, updating a known record, or attaching a user note.
- Return structured evidence, provenance, units, timestamps, eligibility, scope, and sample counts so interpretation remains explainable.
- Use stable identifiers internally while presenting human-readable labels to the user.
- Make tool responses distinguish stored facts, deterministic calculations, user statements, and assistant interpretation.

### Write-action pattern

For consequential record creation or modification:

1. Gather required fields and identify unknowns.
2. Present the complete proposed change.
3. Label calculations and inferences.
4. Obtain explicit confirmation.
5. Submit through the BSE validation layer.
6. Read back the stored record, calculated fields, provenance, and any rejected values.
7. Record the action in the appropriate audit or synchronization log.

This pattern preserves data quality and prevents conversational convenience from weakening the research record.

### Deterministic before generative

Use ordinary application code for arithmetic, eligibility, filtering, thresholds already approved in governance, data validation, synchronization, and audit behavior. Use ChatGPT for language, guided questioning, explanation, summarization, and interpretation where conversational flexibility adds value.

No model should silently calculate or classify something that BSE can calculate or validate deterministically.

## Guardrails

- Evidence before assumptions; unknown means unknown.
- Mechanical explanations before operator error.
- Preserve raw and historical data; corrections supersede rather than erase meaningful evidence.
- Never invent selector values, formulas, thresholds, reference-shot status, faults, or analytical eligibility.
- Keep correlation, hypothesis, prediction, and causation visibly distinct.
- Cite the records, scope, and sample count supporting an interpretation where possible.
- Do not allow prompts or connected content to override BSE permissions or governance.
- Require confirmation for material writes and elevated confirmation for bulk, destructive, sharing, or research-contribution actions.
- Provide a non-AI path for every core logging and account-management workflow.
- Treat model output as advisory until a result is produced and validated by an approved BSE engine or user decision.

## Cost-control principles

- Make bring-your-own ChatGPT access the default conversational model.
- Do not require server-side inference for core logging, deterministic analytics, search, or account operation.
- Avoid recurring AI jobs whose value is speculative or whose cost grows invisibly with user count.
- Prefer user-invoked conversations and on-demand retrieval over continuous synchronization into an AI context.
- Minimize payloads; retrieve only the fields and history needed for the current question.
- Cache non-sensitive, deterministic BSE outputs where architecture permits, not model-generated conclusions as authority.
- If future API use is approved, enforce per-feature budgets, rate limits, usage telemetry, model selection rules, fallbacks, and a kill switch.
- Measure whether AI improves activation, logging completeness, retention, or decision quality before expanding paid inference.

## Security and privacy

- Use explicit OAuth or equivalent delegated authorization; never ask users to paste BSE or Airtable credentials into chat.
- Apply least-privilege, purpose-specific scopes and allow users to revoke access.
- Keep Airtable and PostgreSQL behind the BSE service boundary; do not expose raw schema metadata, formulas, internal IDs, or unrestricted query access unnecessarily.
- Minimize data sent to ChatGPT and exclude secrets, internal operational metadata, and unrelated personal data.
- Show users what will be shared and what action will occur before consequential writes.
- Log integration access and mutations with actor, time, scope, result, and provenance.
- Define retention, deletion, export, incident response, and third-party processor disclosures before public release.
- Treat community research consent separately from ordinary product processing and separately from ChatGPT integration consent.
- Review the current OpenAI plan and app data-control terms during implementation; do not assume one plan's retention or training terms apply to another.

## Current scope

This document currently authorizes no code, phase transition, external integration, or AI engine. It records a product direction that can guide future design:

- BSE remains usable as a structured espresso application without ChatGPT.
- ChatGPT may be documented as an optional, user-funded conversational companion.
- Onboarding and field guidance can be designed so they work in both the BSE interface and a future approved connector/app.
- Deterministic data-quality checks and evidence-rich API responses are compatible with the current architecture.
- Existing phase gates remain in force, including the present block on Phase 2 until the live Airtable synchronization and production-equivalent PostgreSQL migration rehearsals are complete.

## Future scope requiring approval

The following are future possibilities, not commitments:

- A first-party BSE app/connector for ChatGPT.
- Permissioned write actions and guided record creation.
- Personalized education based on a user's BSE history.
- Opt-in citizen-science contribution and anonymized aggregate research.
- BSE-funded API features where a measured business case justifies cost and operational risk.
- Phase 9 AI Coffee Assistant capabilities, only when authorized under the roadmap.

Any material architecture decision should receive an ADR. Any roadmap change must follow roadmap change control. Intelligence functionality must use the existing named phases and research specifications; this strategy must not be used to introduce a parallel or informal intelligence engine.

## Success criteria

This strategy is successful when:

- Users understand that BSE stores and governs the data while ChatGPT provides optional conversational assistance.
- Users are not led to believe their ChatGPT subscription includes BSE-funded API usage.
- Guided onboarding measurably improves complete, valid, comparable records.
- Core BSE functionality does not depend on generative AI availability.
- AI-related marginal cost remains controlled and attributable to approved value.
- Every supported action respects permissions, validation, confirmation, provenance, and audit rules.
- Community research, if introduced, is opt-in, privacy-preserving, and scientifically qualified.
- Existing constitutional, roadmap, ADR, research, Airtable, PostgreSQL, and synchronization authority remains intact.
