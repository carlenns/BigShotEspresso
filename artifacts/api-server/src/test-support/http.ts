// Route-level test helper: boots the real Express app against the PGlite-backed
// `@workspace/db` (export condition `pglite-test`) on an ephemeral port.
import "./env";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { db as appDb } from "@workspace/db";
import { db as testDb, queryCounter } from "@workspace/db/testing";
import { ensureRuntimeSchema } from "../lib/runtime-schema";

export { queryCounter };

let serverPromise: Promise<{ server: Server; baseUrl: string }> | null = null;

async function start() {
  if ((appDb as unknown) !== (testDb as unknown)) {
    throw new Error("Route tests need the pglite-test export condition (run via `pnpm test`).");
  }
  await ensureRuntimeSchema();
  const { default: app } = await import("../app");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

export async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  serverPromise ??= start();
  const { baseUrl } = await serverPromise;
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

export async function stopServer(): Promise<void> {
  if (!serverPromise) return;
  const { server } = await serverPromise;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  serverPromise = null;
}
