import app from "./app";
import { logger } from "./lib/logger";
import { ensureRuntimeSchema } from "./lib/runtime-schema";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  await ensureRuntimeSchema();
} catch (err) {
  logger.error({ err }, "Runtime schema check failed");
  process.exit(1);
}

app.listen(port, (listenErr) => {
  if (listenErr) {
    logger.error({ err: listenErr }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
