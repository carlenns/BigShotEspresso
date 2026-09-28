// System Phase labels (owner-approved 2026-09-28). A System Phase is the broad
// machine/workflow learning era a shot belongs to — NOT Hopper Phase. Labels are
// stored in Settings (`systemPhaseLabels`, JSON) so they can be renamed/extended
// without a deploy; `currentSystemPhase` is the phase new shots start on.
// Seeded server-side (runtime schema guard + migration 0015) without ever
// overwriting saved values. Dependency-free so api-server tests can load it.

export const SYSTEM_PHASE_LABELS_SETTINGS_KEY = "systemPhaseLabels";
export const CURRENT_SYSTEM_PHASE_SETTINGS_KEY = "currentSystemPhase";

export interface SystemPhaseLabel {
  number: number;
  name: string;
}

export const DEFAULT_SYSTEM_PHASE_LABELS: SystemPhaseLabel[] = [
  { number: 1, name: "Initial Setup" },
  { number: 2, name: "Scientific Process / Baseline" },
  { number: 3, name: "Timed Dose Optimization" },
  { number: 4, name: "Active Experimentation Era" },
];

export const DEFAULT_CURRENT_SYSTEM_PHASE = 3;

/** Parse saved labels; fall back to the approved defaults when missing or malformed. */
export function parseSystemPhaseLabels(raw?: string | null): SystemPhaseLabel[] {
  if (!raw) return DEFAULT_SYSTEM_PHASE_LABELS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_SYSTEM_PHASE_LABELS;
    const seen = new Set<number>();
    const labels = parsed
      .filter((p): p is SystemPhaseLabel =>
        !!p && typeof p === "object" &&
        Number.isInteger((p as SystemPhaseLabel).number) && (p as SystemPhaseLabel).number >= 1 &&
        typeof (p as SystemPhaseLabel).name === "string")
      .map((p) => ({ number: p.number, name: p.name.trim() }))
      .filter((p) => (seen.has(p.number) ? false : (seen.add(p.number), true)))
      .sort((a, b) => a.number - b.number);
    return labels.length > 0 ? labels : DEFAULT_SYSTEM_PHASE_LABELS;
  } catch {
    return DEFAULT_SYSTEM_PHASE_LABELS;
  }
}

export function serializeSystemPhaseLabels(labels: SystemPhaseLabel[]): string {
  return JSON.stringify(labels.map(({ number, name }) => ({ number, name: name.trim() })));
}

/** The phase new shots start on: saved setting, else the approved default (3). "" or "none" = no default. */
export function parseCurrentSystemPhase(raw?: string | null): number | null {
  if (raw == null) return DEFAULT_CURRENT_SYSTEM_PHASE;
  if (raw === "" || raw === "none") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_CURRENT_SYSTEM_PHASE;
}

export function systemPhaseName(labels: SystemPhaseLabel[], phase?: number | null): string {
  if (phase == null) return "";
  return labels.find((l) => l.number === phase)?.name ?? "";
}

export function formatSystemPhase(labels: SystemPhaseLabel[], phase?: number | null): string {
  if (phase == null) return "";
  const name = systemPhaseName(labels, phase);
  return name ? `Phase ${phase} — ${name}` : `Phase ${phase}`;
}

// ── Saved Phase Name and Experiment selectors (2026-09-28, Carl-requested) ────
// Per System Phase, the Phase Names and Experiments you have used are saved as
// selector options (Settings keys below, JSON `{ "<phase>": string[] }`). Adding
// a new one in Log Shot saves it immediately so it appears next time. An
// Experiment always belongs to exactly one System Phase (bag-hopper plan,
// 2026-08-25 decision), so experiments are grouped by phase. Seeded once from
// existing shots on deploy; removing an option never changes saved shots.
export const SYSTEM_PHASE_NAME_OPTIONS_SETTINGS_KEY = "systemPhaseNameOptions";
export const SYSTEM_PHASE_EXPERIMENT_OPTIONS_SETTINGS_KEY = "systemPhaseExperimentOptions";

export type PhaseOptionMap = Record<string, string[]>;

export function parsePhaseOptionMap(raw?: string | null): PhaseOptionMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: PhaseOptionMap = {};
    for (const [phase, values] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+$/.test(phase) || !Array.isArray(values)) continue;
      out[phase] = dedupe(values.filter((v): v is string => typeof v === "string"));
    }
    return out;
  } catch {
    return {};
  }
}

function dedupe(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = (raw ?? "").trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

/** Phase Name choices for a phase: its label first, then saved names, plus the current value. */
export function phaseNameOptions(
  labels: SystemPhaseLabel[],
  saved: PhaseOptionMap,
  phase: number | null | undefined,
  current?: string | null,
): string[] {
  if (phase == null) return dedupe([current]);
  return dedupe([systemPhaseName(labels, phase), ...(saved[String(phase)] ?? []), current]);
}

/** Experiment choices for a phase: saved experiments, plus the current value. */
export function experimentOptions(
  saved: PhaseOptionMap,
  phase: number | null | undefined,
  current?: string | null,
): string[] {
  if (phase == null) return dedupe([current]);
  return dedupe([...(saved[String(phase)] ?? []), current]);
}

/** Add a value under a phase (case-insensitive de-duplication). Returns a new map. */
export function addPhaseOption(saved: PhaseOptionMap, phase: number, value: string): PhaseOptionMap {
  const key = String(phase);
  return { ...saved, [key]: dedupe([...(saved[key] ?? []), value]) };
}

export function removePhaseOption(saved: PhaseOptionMap, phase: number, value: string): PhaseOptionMap {
  const key = String(phase);
  const next = (saved[key] ?? []).filter((v) => v.toLowerCase() !== value.trim().toLowerCase());
  const copy = { ...saved };
  if (next.length > 0) copy[key] = next;
  else delete copy[key];
  return copy;
}
