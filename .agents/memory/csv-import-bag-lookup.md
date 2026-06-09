---
name: CSV import bag lookup
description: Import endpoint fetches bags from DB before parsing — no inline bean name inference
---

The `POST /api/shots/import-csv` handler builds a `Map<bagNumber, { bagId, beanName }>` from the DB before calling `parseCsvAndImport`. The parser accepts this as a parameter (defaults to empty map).

**Why:** Hardcoded `beanByBag` dict was replaced to comply with "do not infer/create seed data" — bean names must come from the bags table.

**How to apply:** Always seed beans → bags → then import CSV, in that order. If bags are not yet seeded, shots will import with `bagId=null` and `bean=null`.

Bean IDs after initial seed: MH Brazil=4, MH Guatemala=5, MH Costa Rica=6 (bags 2/3/4 map to DB bag ids 1/2/3).
