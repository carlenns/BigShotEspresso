import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const corsOrigin = process.env.CORS_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? (corsOrigin && corsOrigin.length > 0 ? corsOrigin : false)
    : true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

export default app;
