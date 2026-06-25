# BigShotEspresso Project Constitution

> **Version:** 1.1  
> **Status:** Living Document  
> **Canonical source:** This file  
> **Adopted from:** `PROJECT_CONSTITUTION_v1.1.md` in the parent project workspace

## Mission

BigShotEspresso is a long-term espresso research, operational intelligence, and knowledge-management platform. Its purpose is to transform historical coffee data into explainable, evidence-backed intelligence while preserving the history, reasoning, and research behind every decision.

## Vision

The platform will enable users to:

- Log espresso shots accurately and efficiently.
- Understand why a shot behaved the way it did.
- Learn from historical evidence.
- Predict future success using explainable intelligence.
- Preserve research discoveries permanently.
- Provide AI-assisted recommendations backed by evidence.

## Core architectural principles

1. Airtable is the research knowledge base.
2. PostgreSQL is the operational application database.
3. A synchronization engine keeps both systems aligned.
4. Evidence always takes precedence over assumptions.
5. Mechanical explanations take precedence over operator error.
6. Every recommendation must be explainable.
7. No meaningful history is deleted.
8. Documentation precedes implementation.
9. Every significant decision is traceable.
10. This Constitution has precedence over implementation unless superseded by an approved ADR.

## Document hierarchy

1. `PROJECT_CONSTITUTION.md`
2. Architecture documents
3. Architecture Decision Records
4. Project Notes
5. Implementation plans
6. Application code

If implementation conflicts with documentation, documentation prevails until formally updated.

## Non-negotiable rules

- Never invent selector values.
- Never silently discard historical evidence.
- Preserve backward compatibility whenever practical.
- Every schema change requires migration and rollback.
- Every schema change requires synchronization support.
- No intelligence without supporting evidence.
- Preserve provenance for all imported and synchronized data.
- Documentation before implementation.
- Mechanical explanations before operator error.
- Every recommendation must cite supporting evidence where possible.

## AI developer onboarding

Every AI assistant or developer should:

1. Read this Constitution.
2. Read the Master Development Roadmap.
3. Read relevant ADRs.
4. Read the architecture documents.
5. Review the affected implementation.
6. Produce a plan before coding.
7. Wait for approval.
8. Implement only the approved phase.
9. Verify with tests.
10. Produce a completion report.

## Master development roadmap

- Phase 0 — Project Architecture
- Phase 1 — Data Foundation
- Phase 1.5 — Foundation Stabilization
- Phase 2 — Coffee Log Application Completion
- Phase 2.5 — Knowledge & Provenance System
- Phase 3 — Dose Consistency Intelligence
- Phase 4 — Operational Success Intelligence
- Phase 5 — Hopper Mechanics Intelligence
- Phase 6 — Bag Lifecycle Intelligence
- Phase 7 — Model Exception Intelligence
- Phase 8 — Grind Success Predictor
- Phase 9 — AI Coffee Assistant
- Phase 10 — Knowledge Synchronization Engine
- Phase 11 — Performance & Production
- Phase 12 — Research Platform

## Knowledge and provenance

The platform will maintain:

- Development Change Log
- Knowledge Change Log
- Operational Audit Log
- Architecture Decision Records
- Synchronization Log

History is never deleted; it is superseded.

## Architecture Decision Records

Every major architectural decision should receive a numbered ADR containing:

- Decision ID
- Date
- Status
- Context
- Decision
- Alternatives considered
- Consequences
- Related Project Notes
- Related code changes

## Living sections

- System Architecture
- Database Standards
- Synchronization Standards
- Intelligence Specifications
- Testing Standards
- Development Standards
- Contributor Guide
- Release Process
- Glossary
- Future Ideas Backlog

## Closing principle

BigShotEspresso is not merely a shot logger. It is a continually improving body of knowledge that transforms historical observations into explainable operational intelligence. Every feature, schema change, intelligence engine, and recommendation must advance that mission while preserving the evidence, reasoning, and history that produced it.
