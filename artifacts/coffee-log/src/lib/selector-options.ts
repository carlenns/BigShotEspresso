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
    "Dialed In",
    "Needs Work",
    "Sink Shot",
    "New Bag Setup",
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
  ],
  shotClassification: [
    "Daily Driver",
    "Dial-In Shot",
    "Reference Quality",
    "Balanced Shot",
    "Refined Shot",
    "Experiment",
    "Fast First Pour",
    "Flat",
    "Muted",
    "Boring",
    "Tannic",
    "Under-extracted",
    "Over-extracted",
    "Maintenance / Setup",
    "Sink Shot",
  ],
  expressionStyle: [
    "Balanced",
    "Refined",
    "Bright",
    "Sweet",
    "Chocolatey",
    "Chocolate Leaning",
    "Cacao-Nut",
    "Caramel Leaning",
    "Bittersweet",
    "Fruity",
    "Clean",
    "Heavy / Syrupy",
    "Syrupy",
    "Rich Integrated",
    "Structured",
    "Tea-Like Citrus",
    "Wine-Like Structured",
    "Muted",
    "Harsh",
    "Thin",
  ],
  beanAchievement: [
    "Daily Driver",
    "Best of Bag",
    "Sweet Spot Found",
    "Personal Best",
    "Guest Worthy",
    "Specialty Profile",
    "Comfort Profile",
    "Dynamic Complexity",
    "Structured Acidity",
    "Heavy Body",
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

export function displaySelectorValue(value?: string | null): string {
  if (value === "Grinder Setup") return "New Bag Setup";
  return value ?? "";
}

const INCLUDED_STATUSES = new Set(["Good", "Dialed In"]);
const GOOD_FAULT_VALUES = new Set(["Good"]);

export function describeAnalysisEligibility(status?: string | null, faultStatus: string[] = []): {
  included: boolean;
  reason: string;
} {
  if (!status || !INCLUDED_STATUSES.has(status)) {
    return {
      included: false,
      reason: "Excluded: Shot Status must be Good or Dialed In.",
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
