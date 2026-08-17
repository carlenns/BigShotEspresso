import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export const requireAdminToken: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }

  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: "Admin action unavailable: ADMIN_API_TOKEN is not configured.",
    });
    return;
  }

  const provided = req.header("x-admin-token");
  if (!provided || !safeEqual(provided, expected)) {
    res.status(403).json({ error: "Admin action forbidden." });
    return;
  }

  next();
};
