import { Router, type IRouter } from "express";
import { eq, inArray, isNull, sql } from "drizzle-orm";
import { db, tasteSelectorsTable, shotTasteSelectorsTable, TASTE_SELECTOR_CATEGORIES } from "@workspace/db";
import { STANDARD_SELECTORS, canonicalKeyFor, normalizeSelectorName } from "../lib/taste-selector-names";

const router: IRouter = Router();

// Additive and idempotent: inserts only standard selectors whose name (case-
// insensitive) or key is not already present, active or archived, so it never
// duplicates or un-archives.
router.post("/taste-selectors/seed", async (_req, res): Promise<void> => {
  const existing = await db.select({ name: tasteSelectorsTable.name, canonicalKey: tasteSelectorsTable.canonicalKey }).from(tasteSelectorsTable);
  const existingNames = new Set(existing.map((r) => r.name.toLowerCase()));
  const existingKeys = new Set(existing.map((r) => r.canonicalKey).filter(Boolean));
  const toInsert = STANDARD_SELECTORS
    .map((s) => ({ ...s, canonicalKey: canonicalKeyFor(s.category, s.name) }))
    .filter((s) => !existingNames.has(s.name.toLowerCase()) && !existingKeys.has(s.canonicalKey));
  if (toInsert.length > 0) {
    await db.insert(tasteSelectorsTable).values(toInsert.map((s) => ({ ...s, isDefault: true, origin: "standard" })));
  }
  const all = await db.select().from(tasteSelectorsTable).orderBy(tasteSelectorsTable.sortOrder);
  res.json({ seeded: toInsert.length, total: all.length, selectors: all });
});

// Archived selectors are excluded by default so the shot-form picker never
// offers them; the management page passes includeArchived=true.
router.get("/taste-selectors", async (req, res): Promise<void> => {
  const includeArchived = req.query.includeArchived === "true";
  const rows = await db.select().from(tasteSelectorsTable)
    .where(includeArchived ? undefined : isNull(tasteSelectorsTable.archivedAt))
    .orderBy(tasteSelectorsTable.sortOrder, tasteSelectorsTable.name);
  res.json(rows);
});

function isCategory(value: unknown): value is string {
  return typeof value === "string" && (TASTE_SELECTOR_CATEGORIES as readonly string[]).includes(value);
}

// Names are unique ignoring case, across active and archived selectors.
async function nameTaken(name: string, exceptId?: number): Promise<boolean> {
  const rows = await db.select({ id: tasteSelectorsTable.id }).from(tasteSelectorsTable)
    .where(sql`lower(${tasteSelectorsTable.name}) = ${name.toLowerCase()}`);
  return rows.some((r) => r.id !== exceptId);
}

router.post("/taste-selectors", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = normalizeSelectorName(String(body.name ?? ""));
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  if (body.category != null && !isCategory(body.category)) { res.status(400).json({ error: "Invalid category" }); return; }
  if (await nameTaken(name)) { res.status(409).json({ error: `A selector named "${name}" already exists (it may be archived).` }); return; }
  const [row] = await db.insert(tasteSelectorsTable).values({
    name,
    category: (body.category as string) || "custom",
    isDefault: false,
    origin: "custom",
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 1000,
  }).returning();
  res.status(201).json(row);
});

// Standard selectors keep their name and category so they stay comparable
// across profiles; only custom selectors can be renamed or recategorized.
router.patch("/taste-selectors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  const [existing] = await db.select().from(tasteSelectorsTable).where(eq(tasteSelectorsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const name = body.name != null ? normalizeSelectorName(String(body.name)) : undefined;
  if (name === "") { res.status(400).json({ error: "name is required" }); return; }
  if (body.category != null && !isCategory(body.category)) { res.status(400).json({ error: "Invalid category" }); return; }
  const category = body.category as string | undefined;
  if (existing.origin === "standard" && ((name !== undefined && name !== existing.name) || (category !== undefined && category !== existing.category))) {
    res.status(409).json({ error: "Standard selectors can't be renamed or recategorized. Archive it and add a custom selector instead." });
    return;
  }
  if (name !== undefined && await nameTaken(name, id)) { res.status(409).json({ error: `A selector named "${name}" already exists (it may be archived).` }); return; }
  const [row] = await db.update(tasteSelectorsTable).set({
    name,
    category,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
  }).where(eq(tasteSelectorsTable.id, id)).returning();
  res.json(row);
});

// Archive hides a selector from the picker for new shots; historical shot
// tags are untouched. Restore clears it.
router.post("/taste-selectors/:id/archive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(tasteSelectorsTable).set({ archivedAt: new Date() })
    .where(eq(tasteSelectorsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/taste-selectors/:id/restore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(tasteSelectorsTable).set({ archivedAt: null })
    .where(eq(tasteSelectorsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// Promote a custom selector into the standard (canonical) vocabulary. One-way:
// once standard, its name and category are locked like the seeded ones and it
// gets a permanent canonical key. It must land in a real category — "custom"
// is not a standard category — so the request may supply one.
// Owner-only for now; becomes a curator/admin action once accounts exist
// (docs/architecture/taste-selector-vocabulary-model.md, D3).
router.post("/taste-selectors/:id/promote", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.category != null && !isCategory(body.category)) { res.status(400).json({ error: "Invalid category" }); return; }
  const [existing] = await db.select().from(tasteSelectorsTable).where(eq(tasteSelectorsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.origin === "standard") { res.status(409).json({ error: "Already a standard selector." }); return; }
  const category = (body.category as string | undefined) ?? existing.category;
  if (category === "custom") { res.status(400).json({ error: "Choose a category before making this a standard selector." }); return; }
  const canonicalKey = canonicalKeyFor(category, existing.name);
  const [clash] = await db.select({ name: tasteSelectorsTable.name }).from(tasteSelectorsTable).where(eq(tasteSelectorsTable.canonicalKey, canonicalKey));
  if (clash) { res.status(409).json({ error: `Standard key "${canonicalKey}" is already used by "${clash.name}".` }); return; }
  const [row] = await db.update(tasteSelectorsTable).set({ origin: "standard", category, canonicalKey })
    .where(eq(tasteSelectorsTable.id, id)).returning();
  res.json(row);
});

// Hard delete removes the tag from every historical shot (join rows cascade),
// so it is limited to custom selectors; standard ones are archived instead.
router.delete("/taste-selectors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select({ origin: tasteSelectorsTable.origin }).from(tasteSelectorsTable).where(eq(tasteSelectorsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.origin === "standard") {
    res.status(409).json({ error: "Standard selectors can't be deleted. Archive it to hide it from the shot form." });
    return;
  }
  await db.delete(tasteSelectorsTable).where(eq(tasteSelectorsTable.id, id));
  res.status(204).end();
});

// GET /shots/:id/taste-selectors
router.get("/shots/:id/taste-selectors", async (req, res): Promise<void> => {
  const shotId = parseInt(req.params.id, 10);
  if (isNaN(shotId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const links = await db.select({ tasteSelectorId: shotTasteSelectorsTable.tasteSelectorId })
    .from(shotTasteSelectorsTable)
    .where(eq(shotTasteSelectorsTable.shotId, shotId));
  const ids = links.map((l) => l.tasteSelectorId);
  if (ids.length === 0) { res.json([]); return; }
  const selectors = await db.select().from(tasteSelectorsTable).where(inArray(tasteSelectorsTable.id, ids));
  res.json(selectors);
});

// PUT /shots/:id/taste-selectors — replace full set
router.put("/shots/:id/taste-selectors", async (req, res): Promise<void> => {
  const shotId = parseInt(req.params.id, 10);
  if (isNaN(shotId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids)) { res.status(400).json({ error: "ids array required" }); return; }
  await db.delete(shotTasteSelectorsTable).where(eq(shotTasteSelectorsTable.shotId, shotId));
  if (ids.length > 0) {
    await db.insert(shotTasteSelectorsTable).values(ids.map((tid) => ({ shotId, tasteSelectorId: tid })));
  }
  res.json({ shotId, ids });
});

export { STANDARD_SELECTORS };
export default router;
