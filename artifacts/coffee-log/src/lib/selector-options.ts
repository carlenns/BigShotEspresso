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
    "Fast Flow",
    "Slow Flow",
    "Channeling",
    "Under-extracted",
    "Over-extracted",
    "Dose Uncertainty",
    "Grinder Issue",
    "Workflow Error",
    "Evaluation Compromised",
  ],
  shotClassification: [
    "Good Shot",
    "Dial-In Shot",
    "New Bag Entry",
    "New Bag Dial-In",
    "Bag Closeout",
    "Hopper Refill",
    "Hopper Phase Change",
    "Grinder Event",
    "Grind Change / Purge",
    "Maintenance / Cleaning",
    "Experiment",
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
  drinkType: [
    "Americano",
    "Espresso",
    "Milk Drink",
    "Latte",
    "Cappuccino",
    "Flat White",
    "Affogato",
    "Decaf Espresso",
    "Pour-over",
    "Guest Drink",
    "Other",
  ],
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

// ── User-extensible Drink Type support ────────────────────────────────────────
// Drink Type starts from the curated list above but users can add their own
// (e.g. a specific guest drink) from Defaults & Settings. Custom values are
// stored as a JSON array string under this settings key, alongside the rest
// of the app's arbitrary key/value settings.
export const CUSTOM_DRINK_TYPES_SETTINGS_KEY = "customDrinkTypes";

export function parseCustomDrinkTypes(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

export function mergeDrinkTypeOptions(customDrinkTypes: string[] = [], selectedValue?: string | null): string[] {
  const curated = CURATED_SELECTOR_OPTIONS.drinkType;
  const custom = customDrinkTypes.filter((value) => value && !curated.includes(value));
  const merged = [...curated, ...custom];
  return selectedValue && !merged.includes(selectedValue) ? [...merged, selectedValue] : merged;
}

export function drinkTypeOptionsFromSettings(
  settings?: { customDrinkTypes?: string | null } | null,
  selectedValue?: string | null,
): string[] {
  return mergeDrinkTypeOptions(parseCustomDrinkTypes(settings?.customDrinkTypes), selectedValue);
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
  const reasons: string[] = [];

  if (!status || !INCLUDED_STATUSES.has(status)) {
    reasons.push("Shot Status must be Good or Dialed In.");
  }

  const realFaults = faultStatus.filter((fault) => fault && !GOOD_FAULT_VALUES.has(fault));
  if (faultStatus.length !== 1 || faultStatus[0] !== "Good") {
    reasons.push("Fault Status must be Good.");
  }

  if (reasons.length > 0) {
    const faultDetail = realFaults.length > 0 ? ` Current fault/exception: ${realFaults.join(", ")}.` : "";
    return { included: false, reason: `Excluded: ${reasons.join(" ")}${faultDetail}` };
  }

  return { included: true, reason: `${status} with Fault Status Good is included in analysis.` };
}
