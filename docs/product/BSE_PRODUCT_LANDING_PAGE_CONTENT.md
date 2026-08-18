# BigShotEspresso Product Landing Page Content Brief

> **Status:** Product content draft; not an implementation authorization  
> **Authority:** Subordinate to the Project Constitution, Roadmap, ADRs, and approved product/onboarding guidance  
> **Purpose:** Document the product message and content needed to create a future public landing page

## Positioning

BigShotEspresso is a structured espresso logging and learning system for people who want to make better coffee through repeatable observation.

It is not just a coffee diary. It is a practical scientific process for espresso: record what happened, taste the result, compare against prior evidence, and gradually build a more consistent workflow and palate.

BSE works best when the user has a coffee scale and access to ChatGPT or another capable conversational AI subscription. The scale provides essential shot evidence such as dose and yield. The AI subscription helps the user ask questions, understand the system, improve workflow consistency, and receive guided onboarding. BSE should remain usable without AI, but the public message may say that the strongest experience combines BSE, a scale, and conversational AI.

## Primary audience

Early customers are expected to include:

- Home espresso users who are frustrated and trying to dial in their machine.
- People who want to understand why one shot tasted better than another.
- Users who are willing to taste, rate, and log shots in exchange for clearer feedback.
- Enthusiasts who want a more serious system than casual notes or memory.
- Advanced users who want structured records, bag-level tracking, and future intelligence.

The landing page should not assume every visitor is already an expert. It should welcome beginners and dialing-in users while still sounding credible to serious espresso users.

## Core promise

BigShotEspresso helps you make espresso more repeatable by turning every shot into useful evidence.

The product helps users answer:

- What changed?
- What tasted better?
- Which shots are worth repeating?
- Which bag, grind, dose, yield, timing, and workflow conditions produced success?
- Am I improving, or just guessing?

## Suggested hero message

### Headline options

- Dial in espresso with evidence, not guesswork.
- Log. Taste. Learn. Repeat better espresso.
- A scientific coffee log for serious home espresso.
- Turn every espresso shot into a lesson.

### Supporting copy

BigShotEspresso helps you record the mechanics and taste of each shot, track beans and bags over time, and build a repeatable process for better espresso.

For best results, use BSE with a coffee scale and a conversational AI assistant such as ChatGPT for guided setup, technique questions, and learning support.

## Product pillars

### 1. Scientific shot logging

Record the important facts of each extraction:

- Bag and bean
- Grinder setting
- Grind time
- Initial grinder output
- Actual basket dose
- Dose corrections
- Yield
- Pour delay
- Pour time
- Flow time
- Temperature
- Rating and preference rating
- Faults, notes, and sensory observations

The product should explain that tasting and rating shots is part of the learning process. Repeated tasting helps users build their palate and connect mechanical changes to flavor.

### 2. Bean and bag lifecycle tracking

BigShotEspresso tracks coffee as a physical bag, not only as an abstract bean.

Launch concepts:

- Create the bean record.
- Create a bag linked to that bean.
- Record roast/open/close lifecycle.
- Track active bag context.
- Use bag defaults when logging shots.
- Preserve bag history after closeout.

### 3. Workflow-aware dosing

BSE should support core launch workflows without overbuilding rare methods.

Core workflow concepts:

- Bean feed method, such as hopper-fed or single-dose.
- Dose collection method, such as dose cup or direct-to-portafilter.
- Dose verification method, such as weighed/corrected before basket or assumed dose.
- Bag target dose as a default.
- Explicit user action required to change a bag target dose.

The system should preserve initial grinder output separately from final basket dose so later Dose Consistency Intelligence and Operational Success Intelligence can be built from trustworthy evidence.

### 4. Hopper-aware tracking

For users who use a hopper, BSE treats hopper state as operational evidence.

Launch concepts:

- Hopper fill
- Hopper top-up
- Hopper reconciliation
- Hopper cleanout
- Hopper-to-shot assignment
- Hopper state linked to bag and shot history

The landing page should describe this simply. It should not promise predictive hopper intelligence until HMI is implemented and approved.

### 5. Reference and signature shots

BSE lets users mark successful shots so they can compare future shots against meaningful history.

Concepts:

- Reference Shot: a shot worth comparing against.
- Signature Shot: an extraordinary shot; also a Reference Shot.
- Technical Rating: capped at 10.
- Preference Rating: personal enjoyment, can reach 11 for a rare benchmark shot.

### 6. AI-guided onboarding and coaching

BigShotEspresso can be paired with conversational AI to help users learn the system, improve their workflow, and ask practical espresso questions.

The landing page may say:

- AI can guide new users through their first coffee.
- AI can help users understand what to record and why.
- AI can help users ask better questions about puck prep, tapping, tamping, weighing, and routine consistency.
- AI can answer setup and process questions using BSE onboarding, scientific logging, and product guidance.
- BSE remains the source of truth for records, validation, calculations, and approved analytics.

The page must not imply that ChatGPT replaces the app, owns the data, or performs unapproved intelligence-engine calculations.

### AI plan distinction for onboarding intelligence

The landing page should explain this simply:

- Paid AI plans offer the best BSE experience because they usually provide stronger models, longer conversations, better file/context handling, and fewer usage interruptions.
- Unpaid or free AI plans can still help, but the experience may be limited by upload restrictions, message limits, context limits, model access, or usage caps that are controlled by the AI provider and beyond BSE's control.
- BSE should provide a compact free-tier AI upload brief for limited plans and a fuller onboarding manual for paid AI users.
- This should be framed as user-funded AI support. BSE should not imply that an AI subscription is included in BSE billing.

Suggested wording for the onboarding intelligence section:

> BigShotEspresso works best with a paid AI plan for deeper onboarding, longer context, and richer coffee coaching. Free AI plans can still help, but their experience may be limited by provider-controlled usage restrictions such as upload limits, message caps, or shorter context, which are beyond BSE's control.

## Launch feature set

The launch product should focus on:

- Manual shot logging
- Shot editing
- Bean records
- Bag records
- Bag lifecycle workflow
- Equipment defaults
- Machine capability capture, including PID/timer behavior where available
- Active bag context
- Dose correction evidence
- Optional hopper workflow
- Taste/rating capture
- Reference and signature shots
- Include in Analysis control
- Basic dashboards and historical comparisons
- Secure PostgreSQL-backed storage
- AI-assisted onboarding guidance, where available

## Not launch scope

The landing page should avoid presenting these as current product features:

- Bluetooth scale integration
- Brew-curve capture
- Machine telemetry
- Live device import
- Predictive AI
- Community research exports
- Frozen-dose inventory
- Vacuum-packed dose inventory
- Fully automated dialing-in recommendations

These may be described only as future possibilities where appropriate.

## Future development language

Approved future-facing language:

> Future modules may include brew curves, Bluetooth scale/device compatibility, live extraction telemetry, and specialized workflows such as frozen or vacuum-packed doses. These are post-revenue research-and-development features and are not required for launch.

## Trust and safety message

The product should feel serious and trustworthy:

- Your data is structured and preserved.
- Calculations are deterministic where possible.
- AI guidance is advisory.
- Unknowns remain unknown.
- Analysis uses explicit eligibility rules.
- The app does not silently invent thresholds or conclusions.

## Claims to avoid

Do not claim:

- BSE guarantees better espresso.
- BSE can automatically diagnose every bad shot.
- AI recommendations are scientifically proven before engines are implemented.
- Brew curves or Bluetooth integrations are available at launch.
- User data will be used for community research without opt-in consent.
- Cross-user results prove causation.

## Call-to-action ideas

- Start logging your espresso.
- Dial in with evidence.
- Build your espresso record.
- Learn from every shot.
- Join the early release.

## Open content questions

- Should the first public page target beginners, serious enthusiasts, or both equally?
- Should launch pricing be shown publicly or kept for a private early-access flow?
- Should the page emphasize AI strongly, or position AI as optional support?
- Should the initial release be described as owner-tested/private beta, early access, or launch?
- What screenshots should be used once the core workflow screens are stable?
