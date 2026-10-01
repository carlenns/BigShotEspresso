import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAdminToken } from "./middlewares/admin-auth";
import { securityHeaders } from "./middlewares/security-headers";
import { buildApiRateLimiters } from "./middlewares/rate-limit";

const app: Express = express();
const corsOrigin = process.env.CORS_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Render terminates TLS at one proxy hop. Without this every client would share the
// proxy's address and the rate limiter would act on all users together; with it,
// req.ip is the client address the proxy appended (not spoofable from the request).
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));
}

app.use(securityHeaders);
const rateLimiters = buildApiRateLimiters();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Limits run before body parsing so an over-limit client never gets a 10mb body parsed.
app.use("/api", rateLimiters.general, rateLimiters.writes);
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? (corsOrigin && corsOrigin.length > 0 ? corsOrigin : false)
    : true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Bulk, destructive or credential-using routes: rate limited first (so failed token
// guesses count), then token gated. /api/airtable/test calls Airtable with the server's
// token and is not used by the frontend, so it is gated like the sync routes.
for (const adminPath of [
  "/api/airtable/clear",
  "/api/airtable/sync",
  "/api/airtable/test",
  "/api/shots/import-csv",
  "/api/hoppers/import-csv",
  "/api/hopper-range-baselines/import-csv",
]) {
  app.use(adminPath, rateLimiters.admin, requireAdminToken);
}

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const staticDir = process.env.COFFEELOG_STATIC_DIR
    ? path.resolve(process.env.COFFEELOG_STATIC_DIR)
    : path.resolve(__dirname, "../../coffee-log/dist/public");
  const indexPath = path.join(staticDir, "index.html");

  if (existsSync(indexPath)) {
    app.use(express.static(staticDir, {
      index: false,
      maxAge: "1h",
    }));

    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    logger.warn({ staticDir }, "Coffee Log frontend build was not found; serving API only");
  }
}

// Safety-net error handler — must be registered last (Express recognizes an
// error middleware only by its 4-argument signature). Without this, an
// unhandled exception anywhere in a route falls through to Express's default
// handler: a raw "Internal Server Error" HTML page to the client, and the
// *actual* error is never logged anywhere (pino-http's own request-complete
// log only sees the status code, not the thrown error, when nothing upstream
// attaches it) — the real cause is invisible until someone reproduces it by
// hand. This logs the real error and returns clean JSON instead.
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  (req.log ?? logger).error({ err }, "unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

export default app;
