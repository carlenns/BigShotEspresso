import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/settings", async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  res.json(result);
});

router.put("/settings", async (req, res): Promise<void> => {
  const body = req.body as Record<string, string>;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Body must be a JSON object of key/value pairs" });
    return;
  }
  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(settingsTable)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  res.json({ ok: true });
});

router.delete("/settings/:key", async (req, res): Promise<void> => {
  await db.delete(settingsTable).where(eq(settingsTable.key, req.params.key));
  res.json({ ok: true });
});

export default router;
