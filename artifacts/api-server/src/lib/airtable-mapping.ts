export function normalizeAirtableName(value: string): string {
  return value.toLowerCase().replace(/[\s_\-()/]+/g, "");
}

export function findAirtableField(
  fields: Record<string, unknown>,
  candidates: string[],
): unknown {
  const entries = Object.entries(fields);
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeAirtableName(candidate);
    const found = entries.find(
      ([key]) => normalizeAirtableName(key) === normalizedCandidate,
    );
    if (
      found &&
      found[1] !== undefined &&
      found[1] !== null &&
      found[1] !== ""
    ) {
      return found[1];
    }
  }
  return undefined;
}

export function airtableString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    if (value.length > 1) {
      throw new Error("Expected one text value but Airtable returned multiple values");
    }
    return airtableString(value[0]);
  }
  const result = String(value).trim();
  return result === "" ? undefined : result;
}

export function airtableMulti(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const result = value.map(String).map((item) => item.trim()).filter(Boolean);
    return result.length > 0 ? result : undefined;
  }
  const result = String(value).trim();
  return result === "" ? undefined : [result];
}

export function airtableNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

export function airtableBoolean(value: unknown): boolean | undefined {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase().trim();
  if (["true", "yes", "1", "checked"].includes(normalized)) return true;
  if (["false", "no", "0", "unchecked"].includes(normalized)) return false;
  return undefined;
}

export function singleAirtableLinkedId(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an Airtable linked-record array`);
  }
  if (value.length > 1) {
    throw new Error(`${fieldName} contains multiple linked records`);
  }
  return value.length === 1 ? String(value[0]) : undefined;
}

function field(fields: Record<string, unknown>, ...names: string[]): unknown {
  return findAirtableField(fields, names);
}

export interface ShotAirtableMappingOptions {
  includeInAnalysisFieldPresent: boolean;
}

export function mapAirtableShotFields(
  fields: Record<string, unknown>,
  options: ShotAirtableMappingOptions,
): Partial<InsertShot> {
  const includeRaw = field(fields, "Include in Analysis", "Include In Analysis");

  return {
    shotDate: airtableString(field(fields, "Date", "Shot Date", "Timestamp", "Created", "Date/Time")),
    bagLabel: airtableString(field(fields, "Bag Label")),
    daysSinceOpen: airtableNumber(field(fields, "Days Since Open")),
    grindSetting: airtableNumber(field(fields, "Grinder Setting", "Grind Setting")),
    grindTime: airtableNumber(field(fields, "Grind Time")),
    initialGrindWeight: airtableNumber(field(fields, "Initial Output (g)", "Initial Output")),
    totalOutput: airtableNumber(field(fields, "Total Output (g)", "Total Output")),
    dose: airtableNumber(field(fields, "Dose (g)", "Dose")),
    timeAdj: airtableNumber(field(fields, "Time Adj (sec)", "Time Adjustment")),
    topUpGrind: airtableNumber(field(fields, "Top-Up Grind (g)", "Top Up Grind (g)")),
    overGrindRemoved: airtableNumber(field(fields, "Over Grind Removed (g)")),
    beanDelta: airtableNumber(field(fields, "Bean Delta")),
    grindWaste: airtableNumber(field(fields, "Grind Waste (g)")),
    beansAdded: airtableNumber(field(fields, "Beans Added (g)")),
    doseCorrectionType: airtableString(field(fields, "Dose Correction Type")),
    doseCorrection: airtableNumber(field(fields, "Correction Amount (g)", "Dose Correction")),
    outputDelta: airtableNumber(field(fields, "Output Delta (g)")),
    yield: airtableNumber(field(fields, "Yield (g)", "Yield")),
    ratio: airtableString(field(fields, "Ratio")),
    temperature: airtableNumber(field(fields, "Temp", "Temperature")),
    pourDelay: airtableNumber(field(fields, "Pour Delay", "Pour Delay (s)")),
    pourTime: airtableNumber(field(fields, "Pour Time (sec)", "Pour Time")),
    flowTime: airtableNumber(field(fields, "Flow Time (sec)", "Flow Time", "Scale Time")),
    rating: airtableNumber(field(fields, "Rating")),
    preferenceRating: airtableNumber(field(fields, "Preference Rating")),
    ratingDifference: airtableNumber(field(fields, "Rating Difference")),
    avgWeightedRating: airtableNumber(field(fields, "Average Rating and Preference Rating weighted to Preference")),
    rated: airtableBoolean(field(fields, "Rated")),
    isForOthers: airtableBoolean(field(fields, "For Others")),
    isReference: airtableBoolean(field(fields, "Reference Shot")) ?? false,
    signatureShot: airtableBoolean(field(fields, "Signature Shot")),
    sourShot: airtableBoolean(field(fields, "Sour")),
    boundaryShot: airtableBoolean(field(fields, "Boundary Shot")),
    drinkType: airtableString(field(fields, "Effective Drink Type", "Drink Type")),
    status: airtableString(field(fields, "Shot Status", "Status")),
    shotClassification: airtableMulti(field(fields, "Shot Classification", "Classification")),
    faultStatus: airtableMulti(field(fields, "Fault Status", "Fault")),
    beanAchievement: airtableMulti(field(fields, "Bean Achievement")),
    referenceType: airtableString(field(fields, "Reference Shot Type")),
    expressionStyle: airtableMulti(field(fields, "Expression Style")),
    dailyDriverCount: airtableNumber(field(fields, "Daily Driver Count")),
    includeInAnalysis: options.includeInAnalysisFieldPresent
      ? (airtableBoolean(includeRaw) ?? false)
      : null,
    importantToIntelligence: airtableBoolean(field(fields, "Important to Intelligence")),
    intelligenceLessonType: airtableMulti(field(fields, "Intelligence Lesson Type")),
    notes: airtableString(field(fields, "Notes")),
    sensoryNotes: airtableString(field(fields, "Sensory Notes")),
    faultNotes: airtableString(field(fields, "Fault Notes")),
    bagOpenedDate: airtableString(field(fields, "Bag Opened Date")),
    hopperPhase: airtableString(field(fields, "Hopper Phase")),
    hopperFullness: airtableNumber(field(fields, "Hopper Fullness")),
    hopperPercent: airtableNumber(field(fields, "Hopper %")),
    hopperRange: airtableString(field(fields, "Hopper Range")),
    tasteZone: airtableString(field(fields, "Taste Zone")),
    zone: airtableString(field(fields, "Zone")),
    zoneScore: airtableNumber(field(fields, "Zone Score")),
    tasteScore: airtableNumber(field(fields, "Taste Score")),
    agreementPercent: airtableNumber(field(fields, "Agreement %")),
    flowScore: airtableNumber(field(fields, "Flow Score")),
    modelFlag: airtableString(field(fields, "Model Flag")),
    timeGap: airtableNumber(field(fields, "Time Gap (sec)")),
    scaleZone: airtableString(field(fields, "Scale Zone")),
    flowDiagnostic: airtableString(field(fields, "Flow Diagnostic")),
    pourDelayWindow: airtableString(field(fields, "Pour Delay Window")),
    flowTimeWindow: airtableString(field(fields, "Flow Time Window", "Scale Time Window")),
    flowTimeOffset: airtableNumber(field(fields, "Flow Time Offset (Scale)", "Scale Offset")),
    driftDelta: airtableNumber(field(fields, "Drift Delta (sec)")),
    shotDriftStatus: airtableString(field(fields, "Shot Drift Status")),
    shotQualityScore: airtableNumber(field(fields, "Shot Quality Score")),
    shotTier: airtableString(field(fields, "Shot Tier")),
    perfectRangeFlag: airtableString(field(fields, "Perfect Range Flag")),
    driftWarning: airtableString(field(fields, "Drift Warning")),
    hopperZone: airtableString(field(fields, "Hopper Zone")),
    hopperDriftLink: airtableString(field(fields, "Hopper Drift Link")),
    hopperImpactScore: airtableNumber(field(fields, "Hopper Impact Score")),
    hopperCorrectionRule: airtableString(field(fields, "Hopper Correction Rule")),
    actionSuggestion: airtableString(field(fields, "Action Suggestion")),
    scaleCalibrationReminder: airtableString(field(fields, "Scale Calibration Reminder")),
    bagCalibrationReminder: airtableString(field(fields, "Bag Calibration Reminder")),
    calculation: airtableString(field(fields, "Calculation")),
    baselineUnaidedOutput: airtableNumber(field(fields, "Baseline Unaided Output (g)")),
    baselineOutputDelta: airtableNumber(field(fields, "Baseline Output Delta (g)")),
    actualDoseError: airtableNumber(field(fields, "Actual Dose Error (g)")),
    hopperThresholdFlag: airtableString(field(fields, "Hopper Threshold Flag")),
    hopperBehaviour: airtableString(field(fields, "Hopper Behaviour")),
    hopperSeverity: airtableString(field(fields, "Hopper Severity")),
    topUpGap: airtableNumber(field(fields, "Top-Up Gap (g)")),
    topUpRecommendation: airtableString(field(fields, "Top-Up Recommendation")),
    grindAdjusted: airtableString(field(fields, "Grind Adjusted")),
    shotsLeftEst: airtableNumber(field(fields, "Shots Left (est)")),
    finishedShot: airtableBoolean(field(fields, "Finished Shot")),
    rawRow: fields,
  };
}
import type { InsertShot } from "@workspace/db/schema";
