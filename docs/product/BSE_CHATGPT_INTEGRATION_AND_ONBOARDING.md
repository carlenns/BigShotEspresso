# BigShotEspresso ChatGPT Integration and Onboarding Strategy

> **Status:** Product guidance; not an implementation authorization  
> **Authority:** Subordinate to the [Project Constitution](../PROJECT_CONSTITUTION.md), approved Architecture Decision Records, current architecture documentation, and the [Master Development Roadmap](../ROADMAP.md)  
> **Scope:** Product boundaries, onboarding, cost control, data quality, privacy, and staged integration guidance

For the subscription-price and scaling-cost analysis that supports this strategy, see the [Subscriber Feasibility Study](BSE_SUBSCRIBER_FEASIBILITY.md).

## Executive decision

BigShotEspresso (BSE) is the structured espresso platform. It owns the durable domain model, operational workflows, evidence, provenance, deterministic calculations, and explainable research outputs.

ChatGPT is an optional, user-provided conversational layer. A user may connect ChatGPT to approved BSE data and actions to receive onboarding, education, scientific logging guidance, interpretation, and help completing supported workflows. This does not make ChatGPT the system of record, does not transfer BSE governance to ChatGPT, and does not create a new BSE intelligence engine.

The product should clearly explain that BSE works best when paired with a coffee scale and a capable conversational AI subscription such as ChatGPT or another approved assistant. A scale provides essential mechanical evidence such as dose and yield. Conversational AI helps users understand the process, ask technique questions, and complete onboarding. BSE must remain usable without AI: a user can still log shots, compare results, build reference evidence, and make good coffee. The tradeoff is a steeper learning curve. AI-assisted onboarding should be strongly encouraged for users who want the best learning experience.

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

### Workflow interview and default scientific coaching

AI-assisted onboarding should interview the user's actual workflow before offering coaching. BSE must not assume that every user hopper doses, single doses, weighs before basket, uses a dose cup, owns one grinder, or follows the owner's personal routine.

The assistant should ask how the user currently handles:

- bean feed method, including hopper dosing, single dosing, frozen single doses, or custom routines;
- dose collection, including dose cup or direct-to-portafilter;
- dose verification, including weighed/corrected before basket, weighed after basket, assumed dose, or no scale;
- timed versus manual grinder use;
- new-bag dial-in, stable-bag logging, troubleshooting, and between-bag maintenance.

The default BSE coaching style should treat espresso as a practical scientific experiment:

1. Stabilize the user's routine.
2. Keep dose, yield, temperature, puck prep, basket, screen/paper, and workflow timing consistent where possible.
3. Change only one important variable at a time.
4. Record exactly what changed and what stayed the same.
5. Taste the result and compare it to the previous shot.
6. Avoid causal claims until comparable evidence exists.

This applies to ordinary users, beginners, and most dialing-in sessions. If the user is frustrated, desperate, lost, or unable to dial in, the assistant should slow down even further and explicitly explain the one-variable method.

Power users may intentionally use BSE for broader taste discovery, unusual recipes, brew curves, or less controlled experiments. The assistant should support those users while clearly distinguishing exploration from controlled evidence.

### Learning phases

Onboarding may present BSE as a phased learning system:

1. System Phase 1 — Initial Setup Phase. Record enough equipment, bag, dose, temperature, grinder, scale, and workflow information to begin logging.
2. System Phase 2 — Scientific Process / Baseline Phase. Stabilize the routine and change one important variable at a time. This is the default method for learning espresso because it creates comparable evidence.
3. System Phase 3 — Focused Optimization Phase. Choose one operational question and optimize it deliberately. Example: get timed grinder output close to an 18g target by modifying grind time while keeping target dose, temperature, hopper fill amount, puck prep, and other variables stable.
4. Stable Routine Phase. Repeat successful conditions, mark reference shots, and preserve the settings that produced consistent coffee.
5. Exploration Phase. Support power users or curious users who intentionally explore recipes, brew curves, baskets, dose/yield changes, puck-prep changes, or taste-discovery experiments, while labeling the evidence as exploratory unless controlled.

During the Scientific Process / Baseline Phase, onboarding should usually tell users to put advanced machine variables on hold unless they are the explicit test variable. This includes flow control, pressure profiling, preinfusion changes, brew curves, unusual temperature changes, and other advanced machine controls. The user should first learn how to make good, consistent espresso with a stable routine. After that, those advanced controls can become their own named System Phase or Exploration Phase.

The product should teach that imperfections such as small over-doses, top-ups, or imperfect shots are useful if they are recorded honestly. The problem is not imperfection; the problem is changing too many variables without knowing what caused the result.

System phases should eventually be first-class analysis context. Users may label phases with specific names and purposes, such as `System Phase 3 — Timed Dose Optimization`, `Bluetooth Brew Curve Scale Test`, or `New Grinder Baseline`. Starting a new piece of equipment, workflow, basket, scale, grinder, brew-curve capture method, or major technique change should allow the user to begin a new phase.

Future analysis should support filtering and comparison by system phase. Examples:

- exclude initial setup phases from serious analysis;
- inspect only the phase where the user modified grind time to improve natural 18g dosing;
- compare pre/post equipment phases, such as before and after adding a brew-curve scale;
- compare phases where flow control, preinfusion, or brew curves were held stable versus deliberately changed;
- explain that a phase boundary changes evidence context and may reduce comparability across phases.

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

### 1A. Offer an AI Companion Setup Pack

BSE should offer an optional AI Companion Setup Pack during or immediately after account creation. The pack helps the user create a project, custom assistant, Gem, Claude Project, or equivalent workspace in their chosen AI tool and upload the correct BSE onboarding context.

This should be framed as optional help, not a requirement. BSE remains the system of record and the place where structured records are stored and validated.

The setup flow should provide:

- A large, mobile-friendly **Copy AI setup prompt** button.
- A compact free-tier AI upload file for limited-context plans.
- A fuller paid-tier onboarding manual for project-capable or larger-context AI plans.
- Mobile-friendly download/share actions so phone-only users can send the files into their AI app without needing a desktop file browser.
- Copy/share-first behavior, because finding downloaded `.md` files in the iOS Files app can be confusing for many users.
- A “View full setup text” fallback for manual copy/paste.
- Short setup instructions for ChatGPT, Claude, Gemini, and manual copy/paste.

The bootstrap prompt must tell the external AI to ask whether the user wants Easy Start, Power Setup, or Defer Setup. Easy Start should ask only enough to log the first useful shot. Power Setup should support users who want to configure machine, grinder(s), baskets, scale, active bag, dose method, and preferences immediately. Defer Setup should let users begin logging even when they do not know their equipment details yet.

See [AI Companion Setup Pack](BSE_AI_COMPANION_SETUP_PACK.md).

The user-facing message should include a “Works Best With” explanation: BSE works on its own, but works best with a coffee scale, gradually completed equipment setup, and an AI chat companion that has been given the BSE setup files. Free AI plans can help, but may be limited by provider-controlled upload limits, message caps, context limits, and project/file support. Paid AI plans usually provide the smoothest onboarding experience.

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
- Pressure adjustment, such as an internal screw, OPV adjustment, external knob, or other mechanism.
- Whether pressure adjustment is normally set once and held stable or intentionally changed during shot workflows.
- Preinfusion, flow control, pressure profiling, brew-curve capture, Bluetooth telemetry, or other advanced controls.

Onboarding should also ask whether the user has a scale and some way to time shots. This may be a built-in machine shot timer, a scale timer, a phone timer, or a separate espresso timer. BSE's strongest mechanical evidence depends on dose, yield, and timing. Users without a scale or timer may still log shots, but BSE should clearly describe that analysis confidence will be lower.

This recommendation should be gentle, not annoying or elitist. A basic scale and shot timer are high-value consistency tools. Even a roughly $30 scale and a simple timing method can dramatically improve workflow consistency because the user can measure dose, yield, and timing instead of guessing.

If a user is unable to dial in beans and does not have a scale, onboarding should become more direct: a scale is strongly recommended because repeatable, consistent good shots usually require measured dose and yield. BSE can still guide the process, but missing dose/yield evidence limits the app and the user's ability to learn. If the user's grinder provides reliable weighed dosing, a separate scale may be less necessary for dose, but beverage yield still needs a reliable measurement path for the strongest workflow.

The assistant should be prepared to answer user questions about why these equipment details matter, using approved BSE onboarding, scientific-process, and product-guidance documents. If the assistant does not know a machine specification, it should ask the user to confirm rather than guessing.

When explaining shot timing, onboarding should emphasize practical learning. First pour delay and yield are high-signal observations: they are simple to record, easy to compare across shots, and often teach the user whether grind and puck prep are moving in the right direction. The goal is not to collect numbers for their own sake; it is to help the user discover which measurements actually change the cup.

First pour delay should be framed as a signal, not a direct user-controlled setting. The user generally changes grind setting, grind time, puck prep, dose, or workflow; first pour delay is what the shot reports back. In plain terms, lower first-pour delay usually means faster flow and lower puck resistance, while higher first-pour delay usually means higher resistance and slower flow. Several repeated short first-pour readings may suggest the grind is becoming loose and may need tightening, but the AI should wait for repeated evidence rather than reacting to one shot. As a normal rule of thumb, wait for at least three comparable shots before recommending a grind tightening based on first-pour trend alone, unless the shot is obviously defective. It must consider roast level, bean age, yield, taste, and the user's own reference evidence before giving advice. Do not invent a universal first-pour target: lighter roasts and darker roasts may prefer different windows.

If first pour delay remains similar but yield changes and the cup improves, the AI should treat yield as the likely useful variable for that observation rather than immediately recommending a grind change. Example: two shots with similar first-pour delay may taste different because the user stopped the shot at a different yield; if the slightly higher yield produces better sweetness or caramel, preserve that as yield evidence.

Example: a PID display may show brew temperature at rest, switch to a shot timer when the pump button is pressed, and return to temperature display after the shot. Onboarding should record that exact behavior rather than merely marking `PID = yes`.

Long term, BSE may maintain a curated shared equipment library. User-entered equipment details should begin as personal records. Shared library records should become globally selectable only after BSE review marks them verified. Conflicting or new user-submitted equipment facts should be flagged for review rather than silently becoming product truth.

Some users may come to BSE before buying equipment. The AI onboarding flow may help them think through machine, grinder, scale, and timer choices by asking about budget, space, milk-drink needs, desired workflow, scale availability, timing needs, and tolerance for manual technique. This should be framed as equipment-selection coaching, not as an unverified shopping engine. If the assistant names current machines, grinders, scales, or prices, it must verify current information from reliable sources and label region, date, and uncertainty.

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
- If the app uses a weighted score, explain that it is a user-adjustable ranking lens only. The durable source facts remain `Rating` and `Preference Rating`; changing the weighting recalculates bag and bean summaries without changing historical shot records.

### 4.1 Teach preference and buying profile semantics

Coffee AI should eventually help users build a `Preference & Buying Profile`: what origins, roasters, roast levels, processes, flavour families, and price/value patterns they repeatedly enjoy. This should be treated as a separate shopping and preference-discovery workflow, not as a replacement for shot logging.

The assistant may use the user's historical `Rating`, `Preference Rating`, `Daily Driver`, reference-shot, and bag/bean rollup evidence to explain what the user tends to like. It must clearly distinguish:

- observed history, such as "your highest preference scores are from medium roasts";
- calculated ranking lenses, such as weighted technical/preference score;
- tentative buying suggestions, which are recommendations rather than source data.

### 4.2 Teach Daily Driver semantics

`Daily Driver` is a personal bean achievement, not a generic synonym for “good.” It marks a shot or coffee expression that the user would genuinely want to drink every day: repeatable, enjoyable, comfortable, and aligned with that user’s own taste preferences.

Onboarding and Coffee AI should explain that Daily Driver is intentionally subjective. A technically excellent reference shot may or may not be a Daily Driver. A Daily Driver may be less dramatic than a Signature Shot, but it is highly valuable because it identifies the coffees and recipes that fit the user’s normal life.

Daily Driver must be recorded through `Bean Achievement`, not `Shot Classification`. It should support bag and bean rollups, personal achievements, and future opt-in leaderboards that compare repeatable user-preferred results rather than only highest technical ratings.

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
