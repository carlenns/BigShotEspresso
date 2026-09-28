// Equipment defaults, Option A (Phase 2A S5, approved by Carl 2026-09-28):
// the per-record `isDefault` flag on the Equipment / Accessories pages is the
// single source of truth for "my default machine / grinder / basket / puck
// screen". The old Settings string keys (defaultMachine, defaultGrinder, …)
// are no longer read; their values are migrated once by the backfill below and
// the rows are left in place (inert) rather than deleted.
//
// Dependency-free (no @workspace/db import) so it can be unit-tested directly.

export interface LabelledRow {
  id: number;
  name?: string | null;
  shortLabel?: string | null;
  brand?: string | null;
  model?: string | null;
  size?: string | null;
  specs?: unknown;
  isDefault?: boolean | null;
}

export interface AccessoryRow extends LabelledRow {
  type: string;
  isActive?: boolean | null;
}

export interface MachineRow extends LabelledRow {
  stockBasket?: string | null;
}

/** Same label the Settings dropdowns stored (name, else brand — model — size — specs). */
export function equipmentLabel(item: Omit<LabelledRow, "id">): string {
  if (item.name) return item.name;
  const specs = item.specs && typeof item.specs === "object" ? (item.specs as Record<string, unknown>) : null;
  const specValues = specs
    ? Object.entries(specs)
      .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false && value !== "false")
      .map(([key, value]) => `${key}: ${String(value)}`)
    : [];
  return [item.brand, item.model, item.size, ...specValues].filter(Boolean).join(" — ") || "Unnamed";
}

export function compactRowLabel(row: Omit<LabelledRow, "id"> | null | undefined): string | null {
  if (!row) return null;
  return row.shortLabel || equipmentLabel(row);
}

export function puckScreenLabel(row: Omit<LabelledRow, "id"> | null | undefined): string | null {
  if (!row) return null;
  const specs = row.specs && typeof row.specs === "object" ? (row.specs as Record<string, unknown>) : {};
  const thickness = specs.thickness ? String(specs.thickness) : null;
  const label = row.shortLabel || row.brand || "Puck Screen";
  return `${label} Puck Screen${thickness ? ` ${thickness}` : ""}`;
}

export interface ResolvedDefaults {
  machine: string | null;
  grinder: string | null;
  basket: string | null;
  puckScreen: string | null;
  usePuckScreen: boolean;
}

/** What the Dashboard setup summary shows, from `isDefault` only. */
export function resolveEquipmentDefaults(
  grinders: LabelledRow[],
  machines: MachineRow[],
  accessories: AccessoryRow[],
): ResolvedDefaults {
  const machine = machines.find((m) => m.isDefault) ?? null;
  const grinder = grinders.find((g) => g.isDefault) ?? null;
  const active = accessories.filter((a) => a.isActive !== false);
  const basket = active.find((a) => a.isDefault && a.type === "basket") ?? null;
  const puckScreen = active.find((a) => a.isDefault && a.type === "puck_screen") ?? null;
  return {
    machine: compactRowLabel(machine),
    grinder: compactRowLabel(grinder),
    // No default basket accessory → the default machine's stock basket, if recorded.
    basket: compactRowLabel(basket) ?? (machine?.stockBasket || null),
    puckScreen: puckScreenLabel(puckScreen),
    usePuckScreen: puckScreen != null,
  };
}

// ── One-time backfill from the retired Settings keys (EQ-0 / EQ-4 data step) ──

export const EQUIPMENT_DEFAULTS_BACKFILL_MARKER_KEY = "equipmentDefaultsBackfill";

export type BackfillOutcome =
  | { kind: "set"; table: "machines" | "grinders" | "accessories"; id: number; label: string; from: string }
  | { kind: "already-set"; table: string; label: string; from: string }
  | { kind: "stock-basket"; label: string; from: string }
  | { kind: "ambiguous"; table: string; label: string; from: string; matches: number }
  | { kind: "unmatched"; table: string; label: string; from: string };

interface BackfillInput {
  settings: Record<string, string>;
  grinders: LabelledRow[];
  machines: MachineRow[];
  accessories: AccessoryRow[];
}

/**
 * Plan (pure) the one-time migration of the old Settings strings onto
 * `isDefault`. Never overwrites: if a table/type already has a default, the
 * Settings value is reported as `already-set` and left alone. Never guesses:
 * a label must match exactly one record, otherwise it is reported.
 */
export function planEquipmentDefaultBackfill({ settings, grinders, machines, accessories }: BackfillInput): BackfillOutcome[] {
  const out: BackfillOutcome[] = [];
  const pick = (v?: string) => (v && v.trim() ? v.trim() : null);

  const single = (
    table: "machines" | "grinders" | "accessories",
    from: string,
    label: string | null,
    rows: LabelledRow[],
    alreadyDefault: boolean,
  ) => {
    if (!label) return;
    if (alreadyDefault) { out.push({ kind: "already-set", table, label, from }); return; }
    const matches = rows.filter((r) => equipmentLabel(r) === label || (r.shortLabel && r.shortLabel === label));
    if (matches.length === 1) out.push({ kind: "set", table, id: matches[0]!.id, label, from });
    else if (matches.length > 1) out.push({ kind: "ambiguous", table, label, from, matches: matches.length });
    else out.push({ kind: "unmatched", table, label, from });
  };

  single("machines", "defaultMachine", pick(settings.defaultMachine), machines, machines.some((m) => m.isDefault));
  single(
    "grinders",
    settings.defaultRegularGrinder ? "defaultRegularGrinder" : "defaultGrinder",
    pick(settings.defaultRegularGrinder) ?? pick(settings.defaultGrinder),
    grinders,
    grinders.some((g) => g.isDefault),
  );

  const ofType = (type: string) => accessories.filter((a) => a.type === type);
  const basketLabel = pick(settings.defaultBasket) ?? pick(settings.defaultBasketSize);
  const baskets = ofType("basket");
  if (basketLabel && !baskets.some((b) => b.isDefault)
    && !baskets.some((b) => equipmentLabel(b) === basketLabel || b.shortLabel === basketLabel)
    && machines.some((m) => m.stockBasket === basketLabel)) {
    // The saved default was a machine's stock basket, not an accessory: the
    // Dashboard falls back to the default machine's stock basket, so nothing to set.
    out.push({ kind: "stock-basket", label: basketLabel, from: "defaultBasket" });
  } else {
    single("accessories", "defaultBasket", basketLabel, baskets, baskets.some((b) => b.isDefault));
  }
  const screens = ofType("puck_screen");
  single("accessories", "defaultPuckScreen", pick(settings.defaultPuckScreen), screens, screens.some((s) => s.isDefault));
  return out;
}
