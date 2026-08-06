# ☕ BigShotEspresso

> **A research-driven espresso workflow, analytics, and intelligence platform.**

BigShotEspresso is an evidence-based espresso platform designed to understand **why** espresso behaves the way it does—not simply record what happened.

Unlike traditional espresso logging applications, BigShotEspresso combines operational logging, statistical analysis, mechanical research, and AI-assisted insights into a single long-term knowledge system.

---

# Vision

Most espresso applications answer:

> "What shot did I pull?"

BigShotEspresso aims to answer:

- Why did this shot taste the way it did?
- Why did grinder output change?
- How does hopper fullness affect extraction?
- How does a bean evolve throughout its lifecycle?
- When can I confidently stop weighing doses?
- What can thousands of historical shots teach us?

The objective is to build one of the most comprehensive espresso research platforms available.

---

# Guiding Principles

BigShotEspresso is built upon several non-negotiable principles.

- Evidence over intuition
- Repeatability over novelty
- Mechanical explanations before operator error
- Preserve provenance
- Never silently alter imported evidence
- Research before automation
- AI recommendations must always be evidence-backed
- Every recommendation should be explainable

---

# Project Governance

This repository is governed by:

- `docs/PROJECT_CONSTITUTION.md`

New contributors should begin with:

- `docs/START_HERE.md`

Project planning is maintained in:

- `docs/ROADMAP.md`

Current live Airtable compatibility is tracked in:

- `docs/airtable/README.md`
- `docs/airtable/drift-report-2026-08-06.md`
- `docs/airtable/live-schema-2026-08-06.json`

Repository readiness is verified using:

- `docs/REPOSITORY_CERTIFICATION_AUDIT.md`

---

# System Architecture

BigShotEspresso separates research from operational storage.

## Airtable

Airtable is the authoritative research and authoring environment.

It defines:

- research schema
- field evolution
- operational experiments
- intelligence development
- documentation references

## PostgreSQL

PostgreSQL is the application's operational database.

It provides:

- application performance
- analytics
- dashboard queries
- API access
- transactional integrity

Synchronization preserves provenance while allowing both systems to evolve safely.

---

# Coffee Model

```
Beans
   │
   ▼
 Bags
   │
   ▼
Shots
```

Supporting entities include:

- Hopper
- Hopper Range Baselines
- Shot Fault Rules
- Project Notes
- Rating Systems
- Equipment
- Intelligence metadata

---

# Current Features

Current capabilities include:

- Espresso shot logging
- Bean management
- Bag lifecycle tracking
- Hopper tracking
- Flow Time support
- Dose tracking
- CSV import
- Airtable synchronization
- PostgreSQL support
- OpenAPI contracts
- Generated API clients
- Documentation governance
- Repository certification
- Phase 1.5 stabilization testing

---

# Intelligence Roadmap

The long-term platform includes several independent intelligence engines.

## DCI

Dose Consistency Intelligence

Analyzes:

- grinder repeatability
- dose consistency
- correction behaviour
- timed grinding performance

---

## OSI

Operational Success Intelligence

Determines when weighing doses becomes operationally unnecessary by analyzing historical success probability.

---

## HMI

Hopper Mechanics Intelligence

Researches:

- hopper fullness
- bean-column pressure
- feed consistency
- output drift
- refill behaviour

---

## BLI

Bag Lifecycle Intelligence

Analyzes:

- bean aging
- degassing
- extraction drift
- flavour evolution

---

## MSI

Model Success Intelligence

Tracks:

- operational exceptions
- prediction confidence
- recommendation quality

---

## GSP

Grind Success Predictor

Predicts optimal grinder settings using historical evidence.

---

# Research Philosophy

BigShotEspresso is intentionally designed as a long-term research project.

The platform records real-world usage including:

- workflow interruptions
- spills
- pressure leaks
- entertaining guests
- maintenance
- purge shots
- calibration changes
- hopper refills

Operational reality is considered valuable research data.

---

# Data Integrity

BigShotEspresso treats data as evidence.

Therefore:

- imported CSV files are preserved
- Airtable evidence is preserved
- provenance is never discarded
- raw import rows remain available
- intelligence never modifies source evidence

---

# Documentation

Repository documentation includes:

```
docs/

PROJECT_CONSTITUTION
ROADMAP
START_HERE

ADR/
HISTORY/
RESEARCH/
architecture/
implementation/
prompts/
testing/
```

---

# Technology Stack

- TypeScript
- React
- Node.js
- PostgreSQL
- Drizzle ORM
- Airtable
- OpenAPI
- pnpm

---

# Development Status

Current milestone:

**Foundation Complete**

Completed:

- Project Constitution
- Documentation Governance
- Repository Certification
- Phase 1 Data Foundation
- Phase 1.5 Stabilization
- OpenAPI Alignment
- Migration Framework
- Testing Framework
- GitHub Repository
- Security Hardening

Upcoming:

- Live Airtable verification
- PostgreSQL production rehearsal
- Intelligence engine implementation
- AI assistant integration
- Dashboard evolution

---

# Long-Term Goal

The goal of BigShotEspresso is not merely to log espresso.

The goal is to build an operational knowledge system that continuously learns from evidence, helping users produce more consistent espresso while deepening understanding of grinder mechanics, extraction behaviour, bean evolution, and workflow optimization.

---

© BigShotEspresso Project

Research • Evidence • Intelligence • Repeatability
