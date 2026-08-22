export interface DoseCorrectionFields {
  topUpGrind?: number | null;
  overGrindRemoved?: number | null;
  doseCorrectionType?: string;
  doseCorrection?: number | null;
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateDoseCorrection(
  initialGrindWeight?: number | null,
  targetDose?: number | null,
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
    const correction = Math.abs(delta);
    return {
      topUpGrind: correction,
      overGrindRemoved: null,
      doseCorrectionType: "Under → Top-Up",
      doseCorrection: correction,
    };
  }

  return {
    topUpGrind: null,
    overGrindRemoved: null,
    doseCorrectionType: "None",
    doseCorrection: null,
  };
}
