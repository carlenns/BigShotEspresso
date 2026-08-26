# Equipment Capability and Shared Library Model

Last updated: 2026-08-24

## Purpose

BigShotEspresso needs to record how a user's actual machine, grinder, scale, basket, and accessories behave without inventing equipment facts.

Different machines expose different controls. Some machines have a fixed workflow. Some have PID displays, shot timers, preinfusion, pressure profiling, flow control, pressure-adjustment screws, Bluetooth scales, or brew-curve capture. Those features must be captured as machine-specific capabilities, not assumed from the brand or model name alone.

## Core principle

User equipment records come first. A shared verified equipment library comes later.

The app should let the user create a personal equipment record even if BSE does not yet know that equipment. The record can later be matched against a curated shared library after review.

## Why this matters

Machine features affect interpretation.

Examples:

- A machine may have a PID display that normally shows brew temperature, then switches to a shot timer when the pump button is pressed, then returns to temperature display after the shot.
- A machine may have a pressure-adjustment screw.
- The correct workflow for that pressure screw may be to set it once and leave it stable.
- If the user changes that screw during baseline learning, they have changed a major variable.
- If the user leaves it fixed, the app should treat pressure setting as stable machine context.

The same is true for:

- flow control,
- pressure profiling,
- preinfusion,
- PID temperature behavior,
- shot timer behavior,
- lever behavior,
- pump behavior,
- brew-curve capture,
- basket/puck-screen/accessory changes.

## Personal equipment records

Each user should be able to create their own equipment records.

Personal machine record fields should eventually include:

- user-defined equipment name,
- brand,
- model,
- brew method,
- default machine flag,
- PID temperature control,
- visible PID display,
- display shows brew temperature,
- display switches to shot timer during brewing,
- display returns to temperature after brewing,
- separate shot timer,
- automatic timer start,
- manual timer start,
- temperature setting,
- pressure adjustment available,
- pressure adjustment type, such as internal screw, external knob, OPV adjustment, or unknown,
- whether pressure adjustment is normally fixed or changed during shots,
- preinfusion available,
- preinfusion type,
- flow control available,
- pressure profiling available,
- brew-curve capture available,
- Bluetooth/device telemetry available,
- user notes,
- source/evidence notes.

Personal grinder record fields should eventually include:

- user-defined grinder name,
- brand,
- model,
- primary use,
- burr size,
- burr type,
- hopper-fed or single-dose workflow,
- hopper capacity (guidance, not a hard limit — `docs/table-relationships.md`'s "Hopper percentage" section has the full rule: the app may warn on overfill but must still allow it, and the actual entered Phase Starting Beans always wins),
- preferred hopper phase fill amount,
- timed dosing available,
- manual dosing available,
- minimum timed pulse,
- timed pulse increment,
- default top-up pulse,
- retention notes,
- default grinder flag,
- user notes,
- source/evidence notes.

Personal scale/accessory records should eventually include:

- scale name,
- Bluetooth support,
- brew-curve support,
- timer support,
- auto-start behavior,
- basket size,
- basket rated dose,
- puck screen thickness,
- paper filter workflow,
- tamper type,
- accessory notes.

## Shared equipment library

The shared equipment library should be curated and verified by BSE before being treated as product truth.

Users may submit equipment details, but submitted details should not immediately become globally authoritative.

Early in the product's life, equipment verification will be time-consuming because many machines, grinders, scales, baskets, and accessories will be new to the BSE library. Over time, the library should become a durable product asset. Once common equipment is verified, new users should be able to select their machine, grinder, basket, scale, and workflow from dropdowns and receive a much faster setup experience.

Recommended verification states:

- User Submitted — entered by a user, not verified.
- AI Evidence Drafted — AI has collected candidate evidence but no human/admin has approved it.
- Needs Review — candidate match or detail requiring BSE review.
- Community Supported — multiple users report the same behavior, but BSE has not yet marked it verified.
- Verified — confirmed by BSE from manufacturer documentation, credible owner manual, direct observation, or trusted expert source.
- Disputed — conflicting reports exist.
- Deprecated / Superseded — model variant or earlier entry has been replaced.

Recommended evidence priority:

1. Manufacturer specifications and official product pages.
2. Official owner manuals, service manuals, or manufacturer support documentation.
3. Trusted expert documentation with clear model/version evidence.
4. Retailer product pages and purchase links.
5. User-submitted notes, photos, and community reports.

Retailer pages and user submissions can help identify likely matches, but they should not outrank manufacturer documentation or manuals when BSE verifies shared equipment facts.

## AI-assisted verification workflow

AI can help prepare equipment verification, but it must not be the final authority.

Recommended workflow:

1. A user submits a machine, grinder, scale, basket, or accessory fact.
2. AI searches available evidence in priority order: manufacturer specifications, official manuals/support documents, trusted expert sources, retailer pages, and clearly labeled community reports.
3. AI prepares an admin report with:
   - submitted claim,
   - evidence found,
   - source links or document references,
   - confidence level,
   - conflicting evidence,
   - unresolved questions,
   - recommended verification status.
4. Admin/BSE reviews the report.
5. If evidence is clear, admin marks the fact Verified.
6. If evidence is unclear, the fact remains Needs Review or Disputed.
7. If useful, BSE can put the question to the community for confirmations, disputes, photos, manual excerpts, or variant details.

AI-generated reports must label uncertainty. They must not convert a guess into a verified machine fact.

## Verified-owner community review model

Community input can improve coverage, especially because machine variants and user interpretations differ. However, only verified owners of a specific machine, grinder, scale, or accessory should influence the equipment verification decision for that item.

Non-owners may discuss, ask questions, or provide links to public documentation, but their votes or opinions should not increase the confidence score for how that equipment behaves.

For BSE purposes, a verified owner/user signal may come from the user's own app configuration, system-phase maturity, and logging history. If a machine or grinder is set as the user's main/default equipment and the user is actively logging shots with it, that user can be treated as a verified user of that equipment for community evidence purposes.

Evidence should carry more weight when the user has moved beyond initial setup. For example, a user who completed System Phase 1 and is now at least in System Phase 2 has better evidence than a user who only just created an account. A power user may bypass guided phases, but their evidence can still carry weight if they record consistent good shots with that equipment over time.

Possible verified-owner signals:

- equipment is configured as the user's default machine, grinder, scale, or accessory;
- recent shots are logged with that equipment;
- the equipment has meaningful history in the user's account;
- the user is at least in System Phase 2, or has equivalent demonstrated shot history;
- the user records consistent good shots with the equipment;
- the user has not merely selected the equipment once for a comment or vote;
- future optional evidence, such as photo/manual upload or purchase/ownership confirmation, may raise confidence further.

Possible verified-owner actions:

- confirm a submitted capability,
- dispute a submitted capability,
- report a model variant,
- provide manual excerpts,
- provide photos,
- explain workflow behavior,
- vote that a setting or feature behaves as described.

Possible non-owner actions:

- ask questions,
- link manufacturer documentation,
- link credible reviews or teardown information,
- flag obvious errors for moderation.

Important limitation:

Everyone may have a different idea of how the same feature works. Verified-owner evidence should therefore increase confidence, not automatically create truth. A popular belief can still be wrong, model-specific, region-specific, or based on a modified machine.

Community-supported facts should remain distinct from BSE-verified facts.

## Library maturity path

The shared equipment library should mature in stages:

1. Manual entry phase — users create personal equipment records and notes.
2. Submission phase — users submit equipment facts for review.
3. AI evidence phase — AI prepares verification reports from manuals, manufacturer documentation, and credible sources.
4. Admin verification phase — BSE approves, disputes, or rejects candidate facts.
5. Community-owner support phase — verified owners/users confirm or dispute behavior.
6. Mature library phase — common equipment has verified capability records and can be selected during onboarding.
7. Evidence-backed suggestion phase — BSE can use verified equipment context and aggregate logged shots to suggest starting points.

The long-term value of the library is not only faster setup. It also creates shared context for better comparisons across users, machines, grinders, burrs, baskets, scales, roast levels, and workflow methods.

## Matching model

When a user enters equipment:

1. The app searches the shared library by brand/model.
2. If there is a likely match, the app offers it as a suggestion.
3. The user can accept the match or keep a custom personal record.
4. If the user adds new facts, those facts remain personal until reviewed.
5. BSE can flag new or conflicting details for owner/admin verification.

Do not silently merge user-entered machine facts into the shared library.

## Verified equipment records

A verified machine/grinder/accessory record may later become selectable in dropdowns for all users.

Example:

- BSE verifies a specific machine model.
- The verified record includes whether the pressure adjustment is an internal screw intended to be set and left stable.
- New users selecting that machine can inherit the verified capability description.
- The user can still override personal settings or add notes.

## Evidence-backed starting suggestions

After enough verified equipment and high-quality shot history exists, BSE may suggest starting points for new users.

Examples:

- suggested starting grind range for a specific grinder and burr set;
- likely grind-time range for a timed grinder;
- suggested starting point for light, medium, or dark roasts;
- suggested target yield range for a given dose and roast style;
- known machine capability warnings, such as “hold pressure screw stable during baseline”;
- basket or puck-screen considerations.

These suggestions must be evidence-backed and confidence-labeled.

Inputs may include:

- verified machine model,
- verified grinder model,
- burr size/type,
- basket size,
- scale/timer capability,
- roast level,
- bean density or process if known,
- user workflow method,
- prior BSE logged shots from comparable setups,
- reference-shot and Include-in-Analysis filters.

Important limits:

- Starting suggestions are not final recommendations.
- They should help the user begin dial-in, not skip dial-in.
- They must show sample size and confidence when used analytically.
- They must not imply that one grinder setting works universally across all beans, rooms, burr conditions, or users.
- Environmental factors such as roast age, humidity, storage, grinder retention, water, puck prep, and machine state can change the correct setting.

Launch rule:

Do not implement shared evidence-backed starting suggestions until authentication, privacy controls, opt-in aggregation, equipment verification, and sufficient data-quality filters exist.

## Equipment discovery and recommendation support

Some users may discover BSE before they have chosen a machine, grinder, scale, timer, basket, or workflow. Long term, BSE can support this by combining AI-guided questions with the verified equipment library.

This should be treated as guided equipment discovery, not an unverified shopping engine.

The system may help the user understand:

- whether they need a scale, shot timer, or both;
- whether the machine already provides useful timing;
- whether a phone timer is sufficient for early logging;
- whether a scale should be prioritized before expensive machine changes;
- what grinder precision matters for repeatable dial-in;
- what machine features affect the scientific-process workflow;
- whether advanced features such as flow control, pressure profiling, or brew curves are helpful now or better deferred.

Actual product recommendations must be separated into four layers:

1. Selection criteria: stable requirements and user preferences.
2. Verified equipment facts: BSE-reviewed machine, grinder, scale, timer, basket, and accessory capabilities.
3. Current shopping facts: price, availability, model revisions, bundles, and region.
4. Community evidence: anonymized BSE shot history, verified-owner experience, and confidence-labeled patterns.

Only the first layer is stable enough for launch documentation. The second requires the verified library. The third requires current source verification every time it is used. The fourth requires authentication, consent, privacy controls, moderation, and enough high-quality data.

If BSE or an AI companion names a specific current product, it must verify the claim with current sources and label uncertainty. Product recommendations should never imply that one machine, grinder, scale, or timer is universally best.

## AI onboarding behavior

The AI should ask about equipment capabilities instead of assuming them.

If the user says their machine has a pressure screw, flow control, preinfusion, or brew-curve support, the AI should ask how the user uses that feature:

- fixed setup value,
- adjusted between bags,
- adjusted during every shot,
- used only for experiments,
- unknown.

During baseline learning, the AI should normally recommend holding advanced features stable unless that feature is the named experiment variable.

## Analysis implications

Equipment capabilities should become evidence context for later analysis.

Examples:

- shots before and after a machine pressure change may belong to different system phases;
- shots with flow control held stable are more comparable than shots with active profiling changes;
- brew curves can become a future rich data source but should not be required for launch;
- grinder burr changes, basket changes, puck-screen changes, and scale changes should create phase boundaries or lifecycle events.

## Launch-safe rule

For launch, keep the equipment UI simple and user-owned:

- let the user record enough equipment to log shots,
- allow notes for advanced capabilities,
- do not claim verified equipment knowledge unless it is actually verified,
- do not block shot logging because equipment is incomplete.

Shared verified equipment library work is future scope after account/auth, ownership, moderation, admin review, and privacy controls exist.
