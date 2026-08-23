export interface DoseCorrectionFields {
  topUpGrind?: number | null;
  overGrindRemoved?: number | null;
  doseCorrectionType?: string;
  doseCorrection?: number | null;
  timeAdj?: number | null;
}

function roundToTenth(value: number): number {
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
    return {
      topUpGrind: correction,
      overGrindRemoved: null,
      doseCorrectionType: "Under → Top-Up",
      doseCorrection: correction,
      timeAdj: existingTimeAdj ?? minimumTopUpTime,
    };
  }

  return {
    topUpGrind: null,
    overGrindRemoved: null,
    doseCorrectionType: "None",
    doseCorrection: null,
  };
}
