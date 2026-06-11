import { Router, type IRouter } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { db, tasteSelectorsTable, shotTasteSelectorsTable } from "@workspace/db";

const router: IRouter = Router();

// Seed standard taste selectors if none exist
const STANDARD_SELECTORS = [
  { name: "Balanced", category: "balance", sortOrder: 10 },
  { name: "Acidity", category: "balance", sortOrder: 20 },
  { name: "Sweetness", category: "balance", sortOrder: 30 },
  { name: "Bitterness", category: "balance", sortOrder: 40 },
  { name: "Sourness", category: "balance", sortOrder: 50 },
  { name: "Body", category: "texture", sortOrder: 60 },
  { name: "Texture", category: "texture", sortOrder: 70 },
  { name: "Clarity", category: "texture", sortOrder: 80 },
  { name: "Finish", category: "finish", sortOrder: 90 },
  { name: "Aftertaste", category: "finish", sortOrder: 100 },
  { name: "Dryness", category: "finish", sortOrder: 110 },
  { name: "Astringency", category: "finish", sortOrder: 120 },
  { name: "Brightness", category: "flavor", sortOrder: 130 },
  { name: "Fruitiness", category: "flavor", sortOrder: 140 },
  { name: "Chocolate", category: "flavor", sortOrder: 150 },
  { name: "Caramel", category: "flavor", sortOrder: 160 },
  { name: "Floral", category: "flavor", sortOrder: 170 },
  { name: "Nutty", category: "flavor", sortOrder: 180 },
  { name: "Earthy", category: "flavor", sortOrder: 190 },
  { name: "Roastiness", category: "flavor", sortOrder: 200 },
  { name: "Bright Expression", category: "character", sortOrder: 210 },
  { name: "Guest Worthy", category: "character", sortOrder: 220 },
  { name: "Daily Driver", category: "character", sortOrder: 230 },
  { name: "Cooling Evolution", category: "character", sortOrder: 240 },
  { name: "Wine-like Acidity", category: "character", sortOrder: 250 },
];

router.post("/taste-selectors/seed", async (_req, res): Promise<void> => {
  const existing = await db.select({ name: tasteSelectorsTable.name }).from(tasteSelectorsTable);
  const existingNames = new Set(existing.map((r) => r.name));
  const toInsert = STANDARD_SELECTORS.filter((s) => !existingNames.has(s.name));
  if (toInsert.length > 0) {
    await db.insert(tasteSelectorsTable).values(toInsert.map((s) => ({ ...s, isDefault: true })));
  }
  const all = await db.select().from(tasteSelectorsTable).orderBy(tasteSelectorsTable.sortOrder);
  res.json({ seeded: toInsert.length, total: all.length, selectors: all });
});

router.get("/taste-selectors", async (_req, res): Promise<void> => {
  const rows = await db.select().from(tasteSelectorsTable).orderBy(tasteSelectorsTable.sortOrder, tasteSelectorsTable.name);
  res.json(rows);
});

router.post("/taste-selectors", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.name?.toString().trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(tasteSelectorsTable).values({
    name: String(body.name).trim(),
    category: (body.category as string) || "custom",
    isDefault: false,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 1000,
  }).returning();
  res.status(201).json(row);
});

router.patch("/taste-selectors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  const [row] = await db.update(tasteSelectorsTable).set({
    name: body.name as string | undefined,
    category: body.category as string | undefined,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
  }).where(eq(tasteSelectorsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/taste-selectors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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
