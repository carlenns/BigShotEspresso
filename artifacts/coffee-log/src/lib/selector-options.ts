export interface SelectorOptions {
  expressionStyle: string[];
  beanAchievement: string[];
  shotClassification: string[];
  status: string[];
  faultStatus: string[];
  drinkType: string[];
}

export const TASTE_ZONE_OPTIONS = ["Center", "Edge", "Outside"];

export const CURATED_SELECTOR_OPTIONS: SelectorOptions = {
  status: [
    "Good",
    "Pretty Good",
    "Dialed In",
    "Needs Work",
    "Sink Shot",
    "Grinder Setup",
    "Maintenance",
  ],
  faultStatus: [
    "Good",
    "Sour",
    "Bitter",
    "Fast",
    "Slow",
    "Channeling",
    "Under-extracted",
    "Over-extracted",
    "New Bean",
    "Grind Waste Intentional",
  ],
  shotClassification: [
    "Daily Driver",
    "Dial-In Shot",
    "Experiment",
    "Maintenance / Setup",
    "Sink Shot",
  ],
  expressionStyle: [
    "Balanced",
    "Bright",
    "Sweet",
    "Chocolatey",
    "Fruity",
    "Clean",
    "Heavy / Syrupy",
    "Muted",
    "Harsh",
    "Thin",
  ],
  beanAchievement: [
    "Daily Driver",
    "Best of Bag",
    "Boundary Shot",
  ],
  drinkType: [],
};

export function curatedOptions<K extends keyof SelectorOptions>(
  key: K,
  selectedValues: string[] = [],
): string[] {
  const options = CURATED_SELECTOR_OPTIONS[key] ?? [];
  const selectedHistoricalValues = selectedValues.filter((value) => value && !options.includes(value));
  return [...options, ...selectedHistoricalValues];
}

export function curatedScalarOptions<K extends keyof SelectorOptions>(
  key: K,
  selectedValue?: string | null,
): string[] {
  const options = CURATED_SELECTOR_OPTIONS[key] ?? [];
  return selectedValue && !options.includes(selectedValue) ? [...options, selectedValue] : options;
}

const INCLUDED_STATUSES = new Set(["Good", "Pretty Good", "Dialed In"]);
const GOOD_FAULT_VALUES = new Set(["Good"]);

export function describeAnalysisEligibility(status?: string | null, faultStatus: string[] = []): {
  included: boolean;
  reason: string;
} {
  if (!status || !INCLUDED_STATUSES.has(status)) {
    return {
      included: false,
      reason: "Excluded: Shot Status must be Good, Pretty Good, or Dialed In.",
    };
  }

  if (!faultStatus.includes("Good")) {
    return {
      included: false,
      reason: "Excluded: Fault Status must include Good.",
    };
  }

  const realFaults = faultStatus.filter((fault) => fault && !GOOD_FAULT_VALUES.has(fault));
  if (realFaults.length > 0) {
    return { included: false, reason: `Excluded because Fault Status also contains: ${realFaults.join(", ")}.` };
  }

  return { included: true, reason: `${status} with Fault Status Good is included in analysis.` };
}
