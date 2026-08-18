# BigShotEspresso ChatGPT Integration and Onboarding Strategy

> **Status:** Product guidance; not an implementation authorization  
> **Authority:** Subordinate to the [Project Constitution](../PROJECT_CONSTITUTION.md), approved Architecture Decision Records, current architecture documentation, and the [Master Development Roadmap](../ROADMAP.md)  
> **Scope:** Product boundaries, onboarding, cost control, data quality, privacy, and staged integration guidance

For the subscription-price and scaling-cost analysis that supports this strategy, see the [Subscriber Feasibility Study](BSE_SUBSCRIBER_FEASIBILITY.md).

## Executive decision

BigShotEspresso (BSE) is the structured espresso platform. It owns the durable domain model, operational workflows, evidence, provenance, deterministic calculations, and explainable research outputs.

ChatGPT is an optional, user-provided conversational layer. A user may connect ChatGPT to approved BSE data and actions to receive onboarding, education, scientific logging guidance, interpretation, and help completing supported workflows. This does not make ChatGPT the system of record, does not transfer BSE governance to ChatGPT, and does not create a new BSE intelligence engine.

The product should clearly explain that BSE works best when paired with a coffee scale and a capable conversational AI subscription such as ChatGPT or another approved assistant. A scale provides essential mechanical evidence such as dose and yield. Conversational AI helps users understand the process, ask technique questions, and complete onboarding. BSE must remain usable without AI, but AI-assisted onboarding should be strongly encouraged for users who want the best learning experience.

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

BSE should be presented as a practical scientific process, not merely a coffee diary. The product teaches users to log observations as repeatable experiments while remaining usable for everyday espresso.

Many early users may arrive because they are frustrated, inconsistent, or trying to dial in a machine for the first time. Onboarding should therefore assume the user may need guided tasting, workflow coaching, and help understanding what each recorded variable can teach them, unless they explicitly identify as an experienced espresso user, barista, sensory evaluator, roaster, or advanced taster.

### Core method

- Identify the question being tested, such as hopper state, grind setting, bean age, or workflow timing.
- Record the actual values observed; never substitute targets for measurements.
- Keep actual basket dose distinct from initial grinder output and any top-up, removal, spill, or redistribution loss.
- Capture timestamps and session context so cold-start, rested, and back-to-back conditions can be separated.
- Record mechanical conditions before attributing variation to operator inconsistency.
- Preserve faults, interruptions, and unusual shots as evidence, while using explicit eligibility fields to control serious analysis.
- Separate sensory observations from mechanical measurements and capture taste evolution as the shot cools when useful.
- Encourage the user to taste and rate each drink they reasonably can, because repeated tasting against structured variables is how users build their palate and learn what changes in grind, dose, yield, time, temperature, bean age, and workflow actually taste like.
- Keep `Rating` and `Preference Rating` conceptually separate. `Rating` is the technical/extraction score and is capped at 10. `Preference Rating` is the user's personal enjoyment score and may reach 11 only for rare, once-in-a-blue-moon benchmark shots that exceed the ordinary scale.
- Explain that a Signature Shot is extraordinary and must also be a Reference Shot; a Reference Shot is not automatically a Signature Shot.
- Change one important variable at a time when the user's goal is causal learning, while still supporting real-world multi-variable sessions.
- Mark unknowns as unknown; do not infer missing measurements or selector values.

### Data-quality benefits

Consistent definitions and guided capture produce records that are more comparable across time, bags, equipment, and users. This improves:

- User learning and palette development.
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

The user creates a BSE account, reviews the data and privacy model, and identifies their experience level and goals. BSE explains that it stores the durable record; ChatGPT is optional assistance. The assistant should route the user into an appropriate onboarding style:

- Beginner or dialing-in user: guide the first coffee closely, explain each field, encourage tasting, and help the user connect sensory observations to measured variables without overclaiming causation.
- Experienced user, barista, roaster, or confident taster: offer a faster setup path, preserve expert vocabulary, and avoid over-explaining basics unless requested.

### 2. Configure equipment and defaults

The user records the machine, grinder, basket conventions, scale availability, timer availability, and other approved defaults. BSE validates these fields. The assistant may explain them, but must not invent unknown specifications.

Machine setup should capture concrete capabilities rather than assuming that one feature implies another. In particular, onboarding should ask whether the machine has:

- PID temperature control.
- A visible PID display.
- A PID display that shows brew temperature.
- A PID display that switches to a shot timer during brewing.
- A separate built-in shot timer.
- A timer that starts automatically with pump, lever, or brew activation.
- A timer that must be started manually.
- No built-in timer, requiring an external timer.

Onboarding should also ask whether the user has a scale and explain that BSE's strongest mechanical evidence depends on dose and yield. Users without a scale may still log shots, but BSE should clearly describe that analysis confidence will be lower.

The assistant should be prepared to answer user questions about why these equipment details matter, using approved BSE onboarding, scientific-process, and product-guidance documents. If the assistant does not know a machine specification, it should ask the user to confirm rather than guessing.

### 3. Establish workflow methods and coaching expectations

Onboarding should identify the user's practical coffee workflow as separate, structured concepts rather than one overloaded “dose method.” At minimum, onboarding should distinguish:

- Bean feed method, such as hopper-fed, single-dose, or other/custom.
- Dose collection method, such as dose cup or direct-to-portafilter.
- Dose verification method, such as weighed/corrected before basket, weighed after basket, assumed dose, or other/custom.
- Target-dose behavior, including whether the bag default dose is locked unless the user explicitly chooses to change it.

The assistant should strongly encourage new users to use conversational AI extensively during their early BSE journey for workflow coaching, consistency improvement, and espresso technique questions. Examples include questions about puck preparation, tapping, distribution, tamping, weighing, correction habits, and how to simplify a repeatable routine.

This coaching is advisory. It should help the user improve consistency and understand tradeoffs, but BSE remains the authoritative system for structured records, validation, deterministic calculations, and approved analytics. The assistant must not invent equipment specifications, selector values, thresholds, or unapproved formulas.

Specialized workflows, such as frozen single doses, vacuum-packed doses, pre-weighed tubes, or other advanced preparation methods, may be recorded through custom labels or notes at launch. Dedicated inventory, automation, or analytics for those methods should be future scope only unless user demand justifies implementation.

### 4. Teach scoring semantics

BSE onboarding must teach the difference between technical quality and personal preference:

- `Rating` means technical/extraction quality and is capped at 10.
- `Preference Rating` means personal enjoyment and is capped at 11.
- `11` is intentionally available only for the rare shot that feels over the top, personally exceptional, or benchmark-setting.
- Preference scores above 10 must not be treated as universal technical superiority in DCI, OSI, HMI, MSI, BLI, or GSP.
- Coffee AI responses must preserve this distinction and avoid normalizing an 11-point preference score back into a 10-point technical rating.

### 5. Teach the minimum viable logging protocol

Use a short guided example to distinguish initial output, actual basket dose, corrections, yield, timing, faults, and sensory notes. Explain why timestamps, hopper state, and cooling observations matter.

### 6. Log a first guided shot

ChatGPT can gather observations conversationally and prepare a complete proposed record. For beginner or dialing-in users, the assistant should guide the first drink through both measurement and tasting:

1. Record the mechanical facts: bag, grinder setting, grind time, initial output, dose correction, actual basket dose, yield, pour delay, pour time, flow time, and temperature where available.
2. Ask the user to taste the coffee and describe what they notice: sourness, bitterness, sweetness, body, clarity, finish, balance, harshness, weakness, or pleasantness.
3. Help the user assign a technical `Rating` and optional `Preference Rating`, explaining that the goal is not to be perfect immediately but to build a repeatable palate over time.
4. Label unknowns and avoid inventing selector values, causes, or thresholds.

The user reviews any assumptions, calculations, and unknowns before a supported write. BSE performs final validation and returns the stored and calculated result.

### 7. Connect ChatGPT optionally

If an approved BSE app/connector is available, the user authenticates directly and grants the smallest useful permissions. Onboarding explains which data ChatGPT can retrieve and which actions it can request.

### 8. Deliver an early evidence-backed insight

After sufficient eligible data exists, BSE supplies a small, explainable result—for example, a comparable historical shot or a detected logging gap. Sparse evidence must produce “insufficient evidence,” not a fabricated recommendation.

### 9. Introduce advanced research progressively

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
- Brew-curve capture, Bluetooth scale/device compatibility, machine telemetry, and live extraction data import. These are deferred post-revenue R&D features and should be explained as future possibilities only, not onboarding requirements.

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
