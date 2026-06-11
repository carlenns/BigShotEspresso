import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accessoriesTable } from "@workspace/db";

const router: IRouter = Router();

const ACCESSORY_LABELS: Record<string, string> = {
  basket: "Basket",
  tamper: "Tamper",
  puck_screen: "Puck Screen",
  wdt_tool: "WDT Tool",
  dosing_funnel: "Dosing Funnel",
  dosing_cup: "Dosing Cup",
  blind_shaker: "Blind Shaker / Shaker Cup",
  scale: "Scale",
  distributor: "Distributor / Leveler",
  portafilter: "Portafilter",
  other: "Other",
};

router.get("/accessories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(accessoriesTable).orderBy(accessoriesTable.type, accessoriesTable.brand);
  res.json(rows);
});

router.get("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(accessoriesTable).where(eq(accessoriesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/accessories", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.type) { res.status(400).json({ error: "type is required" }); return; }
  if (body.isDefault) await db.update(accessoriesTable)
    .set({ isDefault: false })
    .where(eq(accessoriesTable.type, body.type as string));
  const [row] = await db.insert(accessoriesTable).values({
    type: body.type as string,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    size: body.size as string | undefined,
    notes: body.notes as string | undefined,
    isActive: body.isActive != null ? Boolean(body.isActive) : true,
    isDefault: Boolean(body.isDefault),
    specs: body.specs as Record<string, unknown> | undefined,
  }).returning();
  res.status(201).json(row);
});

router.patch("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  if (body.isDefault && body.type) {
    await db.update(accessoriesTable).set({ isDefault: false }).where(eq(accessoriesTable.type, body.type as string));
  }
  const [row] = await db.update(accessoriesTable).set({
    type: body.type as string | undefined,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    size: body.size as string | undefined,
    notes: body.notes as string | undefined,
    isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
    specs: body.specs as Record<string, unknown> | undefined,
  }).where(eq(accessoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(accessoriesTable).where(eq(accessoriesTable.id, id));
  res.status(204).end();
});

export { ACCESSORY_LABELS };
export default router;
