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
    "Reference Shot",
    "Signature Shot",
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
    "Reference",
    "Signature",
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
