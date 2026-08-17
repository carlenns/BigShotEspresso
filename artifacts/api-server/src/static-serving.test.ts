import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const staticDir = await mkdtemp(path.join(tmpdir(), "coffee-log-static-"));
await writeFile(
  path.join(staticDir, "index.html"),
  "<!doctype html><title>Coffee Log</title><main id=\"root\"></main>",
);

process.env.NODE_ENV = "production";
process.env.COFFEELOG_STATIC_DIR = staticDir;

const { default: app } = await import("./app");

test("production app serves frontend fallback without swallowing API routes", async () => {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error("Test server did not provide an address");
  const port = address.port;

  try {
    const apiResponse = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    assert.equal(apiResponse.status, 200);
    assert.deepEqual(await apiResponse.json(), { status: "ok" });

    const pageResponse = await fetch(`http://127.0.0.1:${port}/shots/123`);
    assert.equal(pageResponse.status, 200);
    assert.match(await pageResponse.text(), /Coffee Log/);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
