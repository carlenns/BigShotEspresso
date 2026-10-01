import type { Request, RequestHandler } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  /** Return true to leave a request uncounted and unlimited (e.g. health checks). */
  skip?: (req: Request) => boolean;
  /** Defaults to the client IP. With `trust proxy` set, that is the proxy-added address. */
  keyGenerator?: (req: Request) => string;
  /** Test seam: replaces Date.now(). */
  now?: () => number;
}

interface Entry {
  count: number;
  resetAt: number;
}

// Hard ceiling on tracked clients so a flood of distinct addresses cannot grow the
// map without bound between sweeps.
const MAX_TRACKED_KEYS = 50_000;

/**
 * Fixed-window, in-memory limiter. Counts live in this process only, which is correct
 * for the current single Render instance; a multi-instance deployment would need a
 * shared store. Requests over the limit get 429 with Retry-After.
 */
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const now = options.now ?? Date.now;
  const hits = new Map<string, Entry>();

  const sweep = setInterval(() => {
    const t = now();
    for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
  }, Math.max(options.windowMs, 60_000));
  sweep.unref();

  return (req, res, next) => {
    if (options.skip?.(req)) {
      next();
      return;
    }
    const key = options.keyGenerator?.(req) ?? req.ip ?? "unknown";
    const t = now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      if (!entry && hits.size >= MAX_TRACKED_KEYS) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      entry = { count: 0, resetAt: t + options.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - entry.count)));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > options.max) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      return;
    }
    next();
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Limits for the whole API, all per client IP. Defaults are generous for one owner
 * using the app (a dashboard load issues a few dozen requests) and tight for abuse.
 * RATE_LIMIT_DISABLED=1 turns everything off; the other variables tune the defaults.
 */
export function buildApiRateLimiters(): { general: RequestHandler; writes: RequestHandler; admin: RequestHandler } {
  const passThrough: RequestHandler = (_req, _res, next) => next();
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return { general: passThrough, writes: passThrough, admin: passThrough };
  }
  const isHealth = (req: Request) => req.path === "/healthz" || req.originalUrl.split("?")[0] === "/api/healthz";
  const isWrite = (req: Request) => !["GET", "HEAD", "OPTIONS"].includes(req.method);
  return {
    general: createRateLimiter({
      windowMs: 60_000,
      max: positiveInt(process.env.RATE_LIMIT_API_PER_MIN, 600),
      skip: isHealth,
    }),
    writes: createRateLimiter({
      windowMs: 60_000,
      max: positiveInt(process.env.RATE_LIMIT_WRITE_PER_MIN, 120),
      skip: (req) => !isWrite(req),
    }),
    // Bulk/destructive routes. Counts failed token guesses too, because it runs before the token check.
    admin: createRateLimiter({
      windowMs: 15 * 60_000,
      max: positiveInt(process.env.RATE_LIMIT_ADMIN_PER_15MIN, 10),
    }),
  };
}
