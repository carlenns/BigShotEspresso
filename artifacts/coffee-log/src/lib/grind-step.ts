// GRD-1 (Phase 2A S4): the Log Shot grind-setting stepper follows the selected
// grinder's stored adjustment model instead of a fixed 0.01 step.
//
// Rules (display/step only — stored shot values are never rewritten):
//   1. A positive `grindStepIncrement` (marker spacing) is the step.
//   2. Otherwise `grindSettingPrecision` (decimal places, 0–3) gives 10^-precision.
//   3. Otherwise, or with no grinder selected, the historical 0.01.
// +/- results are rounded to the grinder's precision when set (else to the
// step's own decimals) so float noise like 2.3300000001 never appears. Typed
// values are left exactly as typed. Dependency-free for api-server tests.

export const FALLBACK_GRIND_STEP = 0.01;

export interface GrinderAdjustment {
  grindSettingPrecision?: number | null;
  grindStepIncrement?: number | null;
}

function validPrecision(p: number | null | undefined): p is number {
  return p != null && Number.isInteger(p) && p >= 0 && p <= 3;
}

export function grindStepFor(grinder?: GrinderAdjustment | null): number {
  const inc = grinder?.grindStepIncrement;
  if (inc != null && Number.isFinite(inc) && inc > 0) return inc;
  if (validPrecision(grinder?.grindSettingPrecision)) return Math.pow(10, -grinder!.grindSettingPrecision!);
  return FALLBACK_GRIND_STEP;
}

function decimalsOf(n: number): number {
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1]!.length : 0;
}

/** Decimal places used to round stepper output for this grinder. */
export function grindDecimalsFor(grinder?: GrinderAdjustment | null): number {
  if (validPrecision(grinder?.grindSettingPrecision)) {
    // Never round coarser than the step itself (e.g. increment 0.25 with precision 1).
    return Math.max(grinder!.grindSettingPrecision!, decimalsOf(grindStepFor(grinder)));
  }
  return decimalsOf(grindStepFor(grinder));
}

export function roundGrindSetting(value: number, grinder?: GrinderAdjustment | null): number {
  const factor = Math.pow(10, grindDecimalsFor(grinder));
  return Math.round(value * factor) / factor;
}

export function describeGrindStep(grinder?: GrinderAdjustment | null, grinderLabel?: string): string {
  const step = grindStepFor(grinder);
  const inc = grinder?.grindStepIncrement;
  if (inc != null && inc > 0) return `Steps by ${step} (${grinderLabel ?? "this grinder"}'s marker spacing from Equipment).`;
  if (validPrecision(grinder?.grindSettingPrecision)) return `Steps by ${step} (${grinderLabel ?? "this grinder"}'s precision from Equipment).`;
  return grinder
    ? `Steps by ${step}. Set this grinder's precision or marker spacing in Equipment to change it.`
    : `Steps by ${step}. Select a grinder to use its precision from Equipment.`;
}
