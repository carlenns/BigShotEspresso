// Taste selector naming rules (owner decision 2026-09-24).

// Every space-separated word gets an upper-case first letter and a lower-case
// rest, and runs of whitespace collapse: "mInTy  FreshNeSs" → "Minty Freshness".
// Hyphenated words are one word ("Wine-like Acidity" is unchanged).
export function normalizeSelectorName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Permanent, deployment-independent identity for a standard selector, e.g.
// "finish.minty-freshness". Assigned once (seed or promotion) and never
// changed — standard selectors cannot be renamed or recategorized.
// Kept identical to the SQL backfill in 0014_taste_selector_canonical_key.sql.
export function canonicalKeyFor(category: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${category}.${slug}`;
}

// The standard selectors shipped with the app. Names follow
// normalizeSelectorName; each gets a permanent canonicalKeyFor(category, name).
export const STANDARD_SELECTORS = [
  { name: "Balanced", category: "balance", sortOrder: 10 },
  { name: "Acidity", category: "balance", sortOrder: 20 },
  { name: "Sweetness", category: "balance", sortOrder: 30 },
  { name: "Bitterness", category: "balance", sortOrder: 40 },
  { name: "Sourness", category: "balance", sortOrder: 50 },
  { name: "Body", category: "texture", sortOrder: 60 },
  { name: "Texture", category: "texture", sortOrder: 70 },
  { name: "Clarity", category: "texture", sortOrder: 80 },
  { name: "Finish", category: "finish", sortOrder: 90 },
  { name: "Aftertaste", category: "finish", sortOrder: 100 },
  { name: "Dryness", category: "finish", sortOrder: 110 },
  { name: "Astringency", category: "finish", sortOrder: 120 },
  { name: "Brightness", category: "flavor", sortOrder: 130 },
  { name: "Fruitiness", category: "flavor", sortOrder: 140 },
  { name: "Chocolate", category: "flavor", sortOrder: 150 },
  { name: "Caramel", category: "flavor", sortOrder: 160 },
  { name: "Floral", category: "flavor", sortOrder: 170 },
  { name: "Nutty", category: "flavor", sortOrder: 180 },
  { name: "Earthy", category: "flavor", sortOrder: 190 },
  { name: "Roastiness", category: "flavor", sortOrder: 200 },
  { name: "Bright Expression", category: "character", sortOrder: 210 },
  { name: "Guest Worthy", category: "character", sortOrder: 220 },
  { name: "Daily Driver", category: "character", sortOrder: 230 },
  { name: "Cooling Evolution", category: "character", sortOrder: 240 },
  { name: "Wine-like Acidity", category: "character", sortOrder: 250 },
];
