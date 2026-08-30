export interface DoseCorrectionFields {
  topUpGrind?: number | null;
  overGrindRemoved?: number | null;
  doseCorrectionType?: string;
  doseCorrection?: number | null;
  timeAdj?: number | null;
}

export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateDoseCorrection(
  initialGrindWeight?: number | null,
  targetDose?: number | null,
  existingTimeAdj?: number | null,
  minimumTopUpTime = 0.2,
  existingTopUpGrind?: number | null,
): DoseCorrectionFields {
  if (initialGrindWeight == null || targetDose == null) return {};
  if (!Number.isFinite(initialGrindWeight) || !Number.isFinite(targetDose)) return {};
  if (initialGrindWeight <= 0 || targetDose <= 0) return {};

  const delta = roundToTenth(initialGrindWeight - targetDose);

  if (delta > 0) {
    return {
      topUpGrind: null,
      overGrindRemoved: delta,
      doseCorrectionType: "Over → Trim",
      doseCorrection: delta,
    };
  }

  if (delta < 0) {
    const correction = existingTopUpGrind ?? null;
    // Carl's original formula: when the top-up overshoots the target dose, the
    // excess beyond target is recorded as Over Grind Removed and the basket
    // dose is held at target. The primary action was still a top-up, so
    // doseCorrectionType / doseCorrection / topUpGrind / timeAdj are unchanged.
    // Only set overGrindRemoved when it rounds to a positive tenth — otherwise
    // an explicit null (never undefined), including when no top-up was entered
    // or the top-up did not reach the gap.
    const excess =
      existingTopUpGrind != null
        ? roundToTenth(initialGrindWeight + existingTopUpGrind - targetDose)
        : 0;
    return {
      topUpGrind: correction,
      overGrindRemoved: excess > 0 ? excess : null,
      doseCorrectionType: "Under → Top-Up",
      doseCorrection: correction,
      timeAdj: existingTopUpGrind != null ? existingTimeAdj ?? minimumTopUpTime : null,
    };
  }

  return {
    topUpGrind: null,
    overGrindRemoved: null,
    doseCorrectionType: "None",
    doseCorrection: null,
    timeAdj: null,
  };
}
