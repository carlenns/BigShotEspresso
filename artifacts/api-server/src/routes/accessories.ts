import { Router, type IRouter } from "express";
import { and, eq, ne } from "drizzle-orm";
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
  if (isNaN(id)) { res.status(400).json({ error: "That ID isn't valid." }); return; }
  const [row] = await db.select().from(accessoriesTable).where(eq(accessoriesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/accessories", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.type) { res.status(400).json({ error: "A type is required." }); return; }
  // One default per accessory type: clear the others and insert in one transaction.
  const row = await db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx.update(accessoriesTable)
        .set({ isDefault: false })
        .where(eq(accessoriesTable.type, body.type as string));
    }
    const [inserted] = await tx.insert(accessoriesTable).values({
      type: body.type as string,
      shortLabel: body.shortLabel as string | undefined,
      sourceUrl: body.sourceUrl as string | undefined,
      brand: body.brand as string | undefined,
      model: body.model as string | undefined,
      size: body.size as string | undefined,
      notes: body.notes as string | undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : true,
      isDefault: Boolean(body.isDefault),
      specs: body.specs as Record<string, unknown> | undefined,
    }).returning();
    return inserted;
  });
  res.status(201).json(row);
});

router.patch("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "That ID isn't valid." }); return; }
  const body = req.body as Record<string, unknown>;
  // EQ-3: marking an accessory as default must clear the other defaults of the
  // same type even when the request does not resend `type` (e.g. a toggle-only
  // PATCH). Resolve the type from the body, else from the stored row.
  const row = await db.transaction(async (tx) => {
    if (body.isDefault) {
      let type = typeof body.type === "string" && body.type ? body.type : null;
      if (!type) {
        const [existing] = await tx.select({ type: accessoriesTable.type })
          .from(accessoriesTable)
          .where(eq(accessoriesTable.id, id));
        type = existing?.type ?? null;
      }
      if (type) {
        await tx.update(accessoriesTable)
          .set({ isDefault: false })
          .where(and(eq(accessoriesTable.type, type), ne(accessoriesTable.id, id)));
      }
    }
    const [updated] = await tx.update(accessoriesTable).set({
      type: body.type as string | undefined,
      shortLabel: body.shortLabel as string | undefined,
      sourceUrl: body.sourceUrl as string | undefined,
      brand: body.brand as string | undefined,
      model: body.model as string | undefined,
      size: body.size as string | undefined,
      notes: body.notes as string | undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
      isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
      specs: body.specs as Record<string, unknown> | undefined,
    }).where(eq(accessoriesTable.id, id)).returning();
    return updated;
  });
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "That ID isn't valid." }); return; }
  const [existing] = await db
    .select({ id: accessoriesTable.id, type: accessoriesTable.type, isDefault: accessoriesTable.isDefault })
    .from(accessoriesTable)
    .where(eq(accessoriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.isDefault) {
    const label = ACCESSORY_LABELS[existing.type] ?? existing.type;
    res.status(409).json({
      error: `This is the default ${label} — set another as default first, or turn off Default, before deleting.`,
    });
    return;
  }
  await db.delete(accessoriesTable).where(eq(accessoriesTable.id, id));
  res.status(204).end();
});

export { ACCESSORY_LABELS };
export default router;
