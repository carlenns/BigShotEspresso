# BigShotEspresso Subscriber Feasibility Study

> **Status:** Planning model; not a forecast or pricing authorization  
> **Model origin:** June 2026 product-market and launch-economics discussion  
> **Pricing question:** Can a US$10/month subscription support BigShotEspresso as usage scales?  
> **Authority:** Subordinate to the [Project Constitution](../PROJECT_CONSTITUTION.md), [Roadmap](../ROADMAP.md), approved ADRs, and future verified operating data

## Executive conclusion

US$10/month appears economically plausible for BigShotEspresso under the architecture currently intended, but the conclusion is conditional rather than proven.

The price works in the planning model because BSE is primarily a structured SaaS product—not a reseller of continuous AI inference. Users bring their own ChatGPT subscription for the optional conversational layer, routine calculations remain deterministic, and recurring automations are minimized. Under those conditions, marginal cost per subscriber should be driven mainly by payment processing, hosting, database use, storage, authentication, email, monitoring, backups, and support.

At US$10/month, payment processing is proportionally manageable and there is room for infrastructure and an operating reserve. At US$2/month, fixed transaction charges consume too much of each monthly payment, making annual billing disproportionately important and leaving too little room for support and operating costs.

The largest unresolved risk is not raw hosting expense. It is whether BSE can acquire and retain enough serious espresso users at this price while keeping support, compliance, data operations, and future engineering costs within the contribution margin.

## Decision being tested

The feasibility question is:

> If serious espresso enthusiasts pay US$10/month for BSE while separately paying for their own ChatGPT access, can subscriber revenue scale faster than BSE's operating costs without weakening reliability, security, privacy, or research quality?

This study does not establish market demand. It tests whether the proposed price can support the product if paying users are acquired and retained.

## Intended customer and value basis

The assumed customer is a serious espresso enthusiast rather than a casual coffee logger. This user may already spend materially on beans, precision tools, baskets, grinders, machines, water, storage, and controlled workflows.

The value proposition at US$10/month is therefore not merely record storage. BSE is expected to help the user:

- Produce more complete and scientifically useful records.
- Reproduce successful shots and understand failed ones.
- Reduce wasted coffee and unproductive adjustments.
- Preserve equipment-, bean-, bag-, hopper-, extraction-, and sensory history.
- Use explainable analytics and approved intelligence as those capabilities become authorized.
- Receive optional conversational onboarding and interpretation through the user's own ChatGPT account.

Whether customers perceive that value must be validated with real sign-ups, activation, retention, and cancellation evidence.

## Pricing structure modeled

### Founder cohort

- First 500 paid subscribers.
- US$80/year.
- Annual payment preferred because it improves cash flow and reduces payment-processing frequency.

### Standard subscription

- Subscribers after the founder cohort.
- US$10/month, equal to US$120/year before any annual discount.
- A future annual option around US$96–100 was discussed as a potentially attractive annual-first structure, but was not approved.

### Important currency note

The historical planning model presented subscriber revenue in US dollars and also showed a Canadian-dollar equivalent. Payment-provider pricing and foreign-exchange costs can depend on the merchant entity, settlement currency, card origin, taxes, and product configuration. A launch model must use one explicit settlement currency and current verified fees throughout.

## Historical base-case checkpoints

The original model projected paid users in 100-user increments through 10,000. The following checkpoints were recorded in the Coffee Log Airtable table `BSE Launch Economics` during that discussion.

| Paid users | MRR USD | ARR USD | Modeled Replit cost/month | Contribution profit USD/month | Approx. contribution profit CAD/month |
|---:|---:|---:|---:|---:|---:|
| 100 | $666.67 | $8,000 | $95 | $470.87 | $653.99 |
| 500 | $3,333.33 | $40,000 | $95 | $2,934.33 | $4,075.50 |
| 1,000 | $8,333.33 | $100,000 | $95 | $7,521.33 | $10,446.38 |
| 3,000 | $28,333.33 | $340,000 | $170 | $25,794.34 | $35,825.76 |
| 5,000 | $48,333.33 | $580,000 | $270 | $44,042.34 | $61,170.41 |
| 10,000 | $98,333.33 | $1,180,000 | $520 | $89,662.35 | $124,532.04 |

These are historical planning outputs, not currently verified provider quotes or guaranteed profits. The authoritative underlying planning records remain in Airtable and should be exported or read live before revising the model.

## Stress case: two-thirds of the projection

The discussion also tested a simple downside case in which modeled revenue and contribution results were reduced to approximately two-thirds of the base projection.

| Paid users | Two-thirds MRR USD | Two-thirds contribution profit USD/month | Approx. CAD/month |
|---:|---:|---:|---:|
| 100 | $444 | $314 | $436 |
| 500 | $2,222 | $1,956 | $2,717 |
| 1,000 | $5,556 | $5,014 | $6,964 |
| 3,000 | $18,889 | $17,196 | $23,884 |
| 5,000 | $32,222 | $29,362 | $40,780 |
| 10,000 | $65,556 | $59,775 | $83,021 |

This is a sensitivity illustration, not a full downside model. A launch-ready model should stress each driver separately: acquisition, conversion, churn, discounts, payment failure, refunds, support, infrastructure usage, taxes, and staffing.

## Why US$10/month can work

### 1. AI cost is kept outside ordinary BSE usage

Users pay for their own ChatGPT account or subscription. Their ChatGPT subscription is separate from any OpenAI API billing BSE might incur. The design therefore avoids assuming that BSE must pay for every onboarding question, interpretation, or follow-up conversation.

BSE-funded API inference is outside the base model. If later introduced, its cost must be explicitly metered and assigned to an approved feature or plan.

### 2. Core workloads are comparatively predictable

Shot logging, structured retrieval, validation, filtering, deterministic calculations, and ordinary dashboards do not require model inference. Their cost should scale with requests, records, storage, database capacity, and operational requirements rather than conversational token volume.

### 3. Serious enthusiasts may support specialist pricing

For a customer already buying specialty beans and precision equipment, US$120/year may be reasonable if BSE measurably improves consistency, learning, and the usable yield from each bag. The product must demonstrate this value during onboarding and early use.

### 4. Annual billing improves unit economics

Annual billing reduces the number of fixed payment charges, reduces failed-payment opportunities, brings cash forward, and lowers billing administration. The US$80 founder price is therefore both an acquisition incentive and an efficient billing structure.

## Why US$2/month was rejected

The earlier low-price concept was rejected because fixed payment charges become disproportionate at small transaction values.

Using the historical illustration of a CA$0.30 fixed component:

| Structure | Gross annual revenue | Card transactions/year | Fixed CA$0.30 component/year |
|---|---:|---:|---:|
| $2/month | $24 | 12 | $3.60 |
| $24/year | $24 | 1 | $0.30 |
| $20/year | $20 | 1 | $0.30 |

At $2/month, the fixed component alone is 15% of each payment before percentage processing, billing-platform fees, taxes, hosting, support, refunds, or other operations. This does not prove that every $2 product loses money, but it makes the price structurally poor for BSE's intended depth and support burden.

## Cost categories

### Included or represented in the historical model

- Payment processing and recurring-billing fees.
- Replit base and modeled usage costs.
- A Vercel plus Neon comparison.
- A modest variable-operations allowance.
- An operating reserve.
- Database growth and broad migration stages.
- Canadian-dollar conversion for illustration.

### Excluded or insufficiently modeled

- Founder salary or draw.
- Employees and contractors.
- Customer acquisition and paid marketing.
- Customer support time and tooling.
- Legal, accounting, insurance, and corporate administration.
- Sales, value-added, and income taxes.
- Refunds, disputes, fraud, chargebacks, and bad debt.
- Transactional email growth and deliverability operations.
- Observability, backups, disaster recovery, and security services at production scale.
- Privacy, consent, data-export, deletion, and research-governance operations.
- App-store commissions if native-store billing is later used.
- Company-funded AI inference.
- Material foreign-exchange and international-card costs beyond the historical stress assumptions.

For that reason, the reported contribution profit must never be described as take-home income or net profit.

## Unit-economics framework for the next model

The next financial model should calculate at least:

```text
Net revenue per subscriber
= collected subscription revenue
- discounts
- refunds and disputes
- payment processing
- billing platform fees
- sales taxes absorbed by BSE, if any

Contribution margin per subscriber
= net revenue per subscriber
- variable infrastructure
- variable storage and data transfer
- variable email, monitoring, and support tooling
- variable support labor
- approved per-user AI or third-party costs

Operating result
= total contribution margin
- fixed hosting and software
- legal, accounting, insurance, and compliance
- development and contractor costs
- marketing and acquisition
- founder compensation
- other overhead
```

The essential ratios are:

- Gross margin and contribution margin.
- Monthly and annual churn.
- Customer acquisition cost.
- Payback period.
- Lifetime value based on observed retention, not an assumed perpetual subscription.
- Support time and infrastructure cost per active subscriber.
- Active-to-paying conversion and annual-plan adoption.

## Scale and hosting implications

The historical model suggested beginning migration planning around 3,000 paid users and being ready around 5,000. The rationale was reliability, operational control, and database constraints—not an expectation that hosting costs alone would make Replit unaffordable.

That threshold is not a current mandate. Hosting providers, limits, prices, and BSE's architecture can change. Before launch and at each material growth stage, compare measured application behavior against current provider terms.

### Suggested operational gates

| Stage | Required evidence and action |
|---|---|
| Pre-launch | Load test key workflows; validate backups and restore; establish cost and security telemetry. |
| 100 paid users | Measure active usage, database growth, support burden, payment losses, and contribution margin. |
| 500 paid users | Reprice the model using founder-cohort evidence; review annual retention and founder-plan obligations. |
| 1,000 paid users | Conduct architecture, privacy, incident-response, and capacity reviews; create a provider exit plan. |
| About 3,000 paid users | Begin migration preparation if telemetry shows reliability, control, or provider-limit risk. |
| About 5,000 paid users | Be ready to migrate or distribute workloads if approved thresholds are approaching. |
| 10,000 paid users | Operate from measured capacity plans, tested disaster recovery, formal security processes, and current unit economics. |

Subscriber count alone must not trigger migration. Actual database size, request patterns, concurrency, latency, failure rates, support load, provider limits, and recovery requirements are the controlling evidence.

## Security and reliability costs are product costs

Scaling must not preserve margins by deferring necessary controls. The model should fund:

- Tenant isolation and authorization testing.
- Secret management and credential rotation.
- Encryption in transit and at rest where applicable.
- Audit logs for sensitive reads, writes, exports, and consent changes.
- Tested backups, restore procedures, and disaster recovery.
- Monitoring, alerting, incident response, and status communication.
- Dependency, vulnerability, and abuse management.
- Privacy requests, deletion, export, and research-consent operations.

A full rewrite is not automatically required at a particular subscriber count. BSE should evolve through measured bottleneck removal, provider-independent interfaces, rehearsed migrations, and approved ADRs. A rewrite should occur only when evidence shows that incremental change cannot satisfy defined reliability, security, or scale requirements.

## Market feasibility still to validate

Healthy theoretical margins do not prove a viable subscriber business. BSE must test:

- Whether serious enthusiasts will pay US$10/month or prefer an annual plan.
- Whether the founder offer accelerates adoption without creating an unsustainable permanent discount obligation.
- Whether onboarding produces an early result compelling enough to retain users.
- Which features actually drive conversion and renewal.
- Whether requiring a separate ChatGPT plan narrows the addressable market.
- Whether customers without ChatGPT still see sufficient value in the core BSE application.
- How much hands-on support a scientific logging system requires.
- Whether research participation affects trust, conversion, or churn.

## Recommended launch experiment

1. Preserve US$10/month as the standard-price hypothesis, not a settled fact.
2. Offer the first 500 customers US$80/year only if the duration and renewal terms are explicit.
3. Keep the core product valuable without ChatGPT and make ChatGPT integration optional.
4. Recruit a small paid pilot before broad launch.
5. Measure activation, 30/90-day retention, annual conversion, support minutes, active records, database growth, payment losses, and infrastructure cost per subscriber.
6. Review willingness to pay through actual purchase and cancellation behavior rather than survey enthusiasm alone.
7. Rebuild the financial model after the first 100 paid users and again before the founder cohort reaches 500.
8. Do not add recurring server-side AI costs without a separately approved, measured revenue case.

## Community, forums, leaderboards, and media cost note

Future community features could strengthen BSE if the personal logging product proves retention. Examples include equipment leaderboards, workflow achievements, user profiles, bag/grinder discussion threads, opt-in research cohorts, and photo-supported records or posts.

Daily Driver should be treated as a particularly useful future leaderboard dimension because it measures everyday desirability rather than only peak technical achievement. A Daily Driver leaderboard should be opt-in and preference-aware: it should help users discover coffees, recipes, equipment setups, and workflows that repeatedly produce “I would drink this every day” results for people with similar preferences. It must not imply universal superiority, because Daily Driver is intentionally tied to individual taste.

These features should not be assumed free inside the original US$10/month planning model. The cost impact depends heavily on scope:

- Text-only leaderboards and achievements are likely modest if they use existing structured records and cached aggregate queries.
- Forums add moderation, abuse handling, notification, privacy, and support burden even when database cost is small.
- Photos and other media can become a meaningful variable cost because they require object storage, image processing/resizing, bandwidth, retention policy, privacy controls, and abuse prevention.
- Community analytics require opt-in consent, de-identification, cohort-size protections, and careful explanation of correlation versus causation.

The practical pricing assumption is:

- US$10/month can remain plausible for a structured personal logging app with limited cached leaderboards and small controlled media use.
- US$10/month becomes riskier if BSE includes unlimited photos, active forums, high-bandwidth media feeds, heavy notifications, server-side AI features, or hands-on support without limits.
- Public community/media features should be gated behind measured pilot usage, storage quotas, compression, moderation rules, and a refreshed provider-cost model.

Recommended staged approach:

1. Launch personal logging and deterministic dashboards first.
2. Add local achievements that use existing private data.
3. Add opt-in aggregate leaderboards without photos.
4. Add tightly limited photo attachments only if they serve a clear workflow purpose.
5. Add forums/community interaction only after moderation, privacy, and support policies are funded.

## Go/no-go criteria for US$10/month

US$10/month remains feasible if launch evidence shows all of the following:

- The price supports a strong contribution margin after real variable costs and support.
- Retention is sufficient for customer lifetime value to exceed acquisition and onboarding costs by an approved margin.
- Core BSE usage remains useful without BSE-funded model inference.
- Security, privacy, reliability, backup, and support obligations can be funded rather than deferred.
- Provider limits can be managed through staged scaling rather than an emergency rewrite.
- Users understand the separate BSE and ChatGPT charges and still perceive sufficient combined value.

If these conditions fail, the response should be evidence-driven: adjust price, annual discount, feature packaging, support model, architecture, or target customer. The solution should not be to conceal costs, weaken controls, or assume unproven scale.

## Bottom line

The historical model supports US$10/month as a credible launch hypothesis. It is materially safer than a $2/month price and becomes more plausible when users bring their own ChatGPT subscription and BSE minimizes automated AI spending.

However, the attractive historical contribution figures are not a guarantee of net profit. Before launch, all provider prices, payment fees, taxes, exchange assumptions, infrastructure limits, and privacy/security obligations must be refreshed. After launch, subscriber retention, support burden, acquisition cost, and measured per-user infrastructure usage become the authoritative evidence.
