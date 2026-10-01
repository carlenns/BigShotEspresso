import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";

const staticDir = await mkdtemp(path.join(tmpdir(), "coffee-log-security-"));
await writeFile(path.join(staticDir, "index.html"), "<!doctype html><title>Coffee Log</title>");

// Production mode with tiny limits so the tests stay fast. Nothing here touches the
// database: only /api/healthz, unknown /api paths, and token-gated admin routes.
process.env.NODE_ENV = "production";
process.env.COFFEELOG_STATIC_DIR = staticDir;
process.env.DATABASE_URL ??= ["postgresql:", "", "test.invalid", "security"].join("/");
delete process.env.ADMIN_API_TOKEN;
process.env.RATE_LIMIT_API_PER_MIN = "5";
process.env.RATE_LIMIT_WRITE_PER_MIN = "3";
process.env.RATE_LIMIT_ADMIN_PER_15MIN = "3";

const { default: app } = await import("./app");
const { CONTENT_SECURITY_POLICY } = await import("./middlewares/security-headers");
const { createRateLimiter } = await import("./middlewares/rate-limit");

const server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
after(() => new Promise<void>((resolve) => server.close(() => resolve())));

// `trust proxy` is 1 in production, so the right-most X-Forwarded-For entry is the
// client address; each test uses its own so limits never bleed between tests.
function req(pathname: string, ip: string, init: RequestInit = {}) {
  return fetch(`${base}${pathname}`, {
    ...init,
    headers: { "x-forwarded-for": ip, ...(init.headers as Record<string, string> | undefined) },
  });
}

test("responses carry a strict CSP, HSTS in production, and the existing headers", async () => {
  const res = await req("/api/healthz", "10.0.0.1");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-security-policy"), CONTENT_SECURITY_POLICY);
  assert.equal(res.headers.get("strict-transport-security"), "max-age=15552000");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
});

test("the CSP allows only what the app needs and no script escape hatches", () => {
  const directives = Object.fromEntries(
    CONTENT_SECURITY_POLICY.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values.join(" ")];
    }),
  );
  assert.equal(directives["default-src"], "'self'");
  assert.equal(directives["script-src"], "'self'");
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /unsafe-eval/);
  assert.doesNotMatch(directives["script-src"], /unsafe-inline/);
  assert.equal(directives["object-src"], "'none'");
  assert.equal(directives["frame-ancestors"], "'none'");
  assert.equal(directives["connect-src"], "'self'");
  assert.match(directives["style-src"], /https:\/\/fonts\.googleapis\.com/);
  assert.match(directives["font-src"], /https:\/\/fonts\.gstatic\.com/);
});

test("the SPA page also gets the CSP", async () => {
  const res = await req("/shots/123", "10.0.0.2");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-security-policy"), CONTENT_SECURITY_POLICY);
});

test("health checks are never rate limited", async () => {
  for (let i = 0; i < 12; i++) {
    assert.equal((await req("/api/healthz", "10.0.0.3")).status, 200);
  }
});

test("the general API limit returns 429 with Retry-After, per client address", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await req("/api/nope", "10.0.0.4")).status, 404);
  const blocked = await req("/api/nope", "10.0.0.4");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
  assert.equal(blocked.headers.get("ratelimit-limit"), "5");
  assert.equal(blocked.headers.get("ratelimit-remaining"), "0");
  assert.match((await blocked.json() as { error: string }).error, /too many requests/i);
  // A different client address has its own budget.
  assert.equal((await req("/api/nope", "10.0.0.5")).status, 404);
});

test("write methods have a tighter limit than reads", async () => {
  const post = () => req("/api/nope", "10.0.0.6", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
  for (let i = 0; i < 3; i++) assert.equal((await post()).status, 404);
  assert.equal((await post()).status, 429);
  // Reads from the same client are still inside the general budget (4 of 5 used).
  assert.equal((await req("/api/nope", "10.0.0.6")).status, 404);
});

test("admin routes are rate limited before the token check, so guesses are throttled", async () => {
  const clear = () => req("/api/airtable/clear", "10.0.0.7", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true }) });
  for (let i = 0; i < 3; i++) assert.equal((await clear()).status, 503); // no ADMIN_API_TOKEN configured
  assert.equal((await clear()).status, 429);
});

test("/api/airtable/test now requires the admin token like the other Airtable routes", async () => {
  const res = await req("/api/airtable/test", "10.0.0.8", { method: "POST" });
  assert.equal(res.status, 503);
});

test("createRateLimiter counts per key, resets after the window, and skips when told to", () => {
  let t = 1_000;
  const limiter = createRateLimiter({
    windowMs: 1_000,
    max: 2,
    now: () => t,
    skip: (r) => (r as { path?: string }).path === "/skip",
    keyGenerator: (r) => String((r as { key?: string }).key),
  });
  const call = (key: string, path = "/x") => {
    let status = 200;
    let nexted = false;
    const res = {
      setHeader() {},
      status(code: number) { status = code; return this; },
      json() { return this; },
    };
    limiter({ key, path } as never, res as never, () => { nexted = true; });
    return { status, nexted };
  };
  assert.equal(call("a").nexted, true);
  assert.equal(call("a").nexted, true);
  assert.deepEqual(call("a"), { status: 429, nexted: false });
  assert.equal(call("b").nexted, true); // separate key
  assert.equal(call("a", "/skip").nexted, true); // skipped requests are not counted
  t += 1_001; // window elapsed
  assert.equal(call("a").nexted, true);
});
