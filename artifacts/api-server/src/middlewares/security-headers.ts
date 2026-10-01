import type { RequestHandler } from "express";

// The production server serves the built SPA from the same origin as the API, so
// the policy can be strict. What the frontend actually loads (checked 2026-10-01):
// one same-origin module script and stylesheet, Google Fonts (CSS from
// fonts.googleapis.com, files from fonts.gstatic.com), inline style attributes and
// a generated <style> tag (shadcn chart), and no inline scripts or eval.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// 180 days. No includeSubDomains/preload: the host is a Render subdomain today and a
// custom domain later, and neither should be committed to preload by this header.
const HSTS = "max-age=15552000";

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", HSTS);
  }
  next();
};
