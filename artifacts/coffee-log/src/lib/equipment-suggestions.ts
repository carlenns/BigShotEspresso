export type SuggestionConfidence = "User-confirmed" | "BSE suggested — review before saving";

export type GrinderSuggestion = {
  kind: "grinder";
  match: string[];
  label: string;
  confidence: SuggestionConfidence;
  values: {
    name: string;
    brand: string;
    model: string;
    type: string;
    burrSize: string;
    burrType: string;
    adjustmentType: string;
    grindSettingPrecision: string;
    grindStepIncrement: string;
    notes: string;
  };
};

export type MachineSuggestion = {
  kind: "machine";
  match: string[];
  label: string;
  confidence: SuggestionConfidence;
  values: {
    name: string;
    brand: string;
    model: string;
    brewMethod: string;
    stockBasket: string;
    notes: string;
  };
};

export type AccessorySuggestion = {
  kind: "accessory";
  match: string[];
  label: string;
  confidence: SuggestionConfidence;
  values: Record<string, string>;
};

export const GRINDER_SUGGESTIONS: GrinderSuggestion[] = [
  {
    kind: "grinder",
    match: ["eureka", "magnifico", "mignon magnifico"],
    label: "Eureka Mignon Magnifico",
    confidence: "BSE suggested — review before saving",
    values: {
      name: "Eureka Mignon Magnifico",
      brand: "Eureka",
      model: "Mignon Magnifico",
      type: "Espresso",
      burrSize: "55mm",
      burrType: "Flat",
      adjustmentType: "Stepless",
      grindSettingPrecision: "2",
      grindStepIncrement: "0.33",
      notes: "Suggested profile. Review before saving; burr/version details may vary by model year or region.",
    },
  },
];

export const MACHINE_SUGGESTIONS: MachineSuggestion[] = [
  {
    kind: "machine",
    match: ["profitec", "go", "profitec go"],
    label: "Profitec Go",
    confidence: "BSE suggested — review before saving",
    values: {
      name: "Profitec Go",
      brand: "Profitec",
      model: "Go",
      brewMethod: "Espresso",
      stockBasket: "Profitec Go Stock Basket",
      notes: [
        "Suggested profile. Review before saving.",
        "Known workflow note from user setup: PID displays brew temperature, then switches to shot timer when the pump starts.",
        "Pressure is user-adjustable by screw; treat pressure as a stable machine setting during normal shot experiments.",
      ].join(" "),
    },
  },
];

export const ACCESSORY_SUGGESTIONS: AccessorySuggestion[] = [
  {
    kind: "accessory",
    match: ["normcore", "spring tamper", "spring-loaded tamper", "v4 tamper", "b0c6hnpybq"],
    label: "Normcore Spring-Loaded Tamper",
    confidence: "User-confirmed",
    values: {
      type: "tamper",
      brand: "Normcore",
      model: "V4 Spring-Loaded Tamper",
      size: "58mm",
      springLoaded: "true",
      springPressure: "25 lb",
      notes: "User-confirmed setup: 25 lb spring installed. Available spring options: 15 lb, 25 lb, 30 lb. Product lookup suggests V4 58mm spring-loaded tamper; review size before saving.",
    },
  },
  {
    kind: "accessory",
    match: ["normcore", "puck screen", "puck screens", "b0b46vft8p"],
    label: "Normcore 58.5mm Puck Screen Set",
    confidence: "BSE suggested — review before saving",
    values: {
      type: "puck_screen",
      brand: "Normcore",
      model: "2-Pack Puck Screen with Stand",
      size: "58.5mm",
      thickness: "1.7mm",
      notes: "Suggested from product lookup. Product appears to include 58.5mm puck screens with 1.0mm and 1.7mm thickness options; select the thickness currently in use before saving.",
    },
  },
  {
    kind: "accessory",
    match: ["maestri", "maestri house", "scale", "coffee scale", "espresso scale", "b0cqy78hv6"],
    label: "Maestri House Mini Espresso Scale",
    confidence: "BSE suggested — review before saving",
    values: {
      type: "scale",
      brand: "Maestri House",
      model: "Mini Coffee Scale with Timer",
      size: "2kg / 0.1g",
      notes: "Suggested from product lookup. USB-C rechargeable espresso/pour-over scale with timer, 2kg capacity, and 0.1g precision. Review exact model/color before saving.",
    },
  },
  {
    kind: "accessory",
    match: ["bamynoir", "wdt", "distribution", "espresso stirrer", "b0dp9zchcd"],
    label: "Bamynoir WDT Distribution Tool",
    confidence: "BSE suggested — review before saving",
    values: {
      type: "wdt_tool",
      brand: "Bamynoir",
      model: "WDT Distribution Tool",
      size: "58mm",
      notes: "Suggested from product lookup. WDT espresso distribution tool for declumping and levelling grounds; review compatibility/size before saving.",
    },
  },
  {
    kind: "accessory",
    match: ["matow", "dosing funnel", "dosing ring", "magnetic funnel", "b0cm5xdgfr"],
    label: "MATOW Magnetic Dosing Funnel",
    confidence: "BSE suggested — review before saving",
    values: {
      type: "dosing_funnel",
      brand: "MATOW",
      model: "V2 Magnetic Dosing Funnel",
      size: "58mm",
      notes: "Suggested from product lookup. Stainless magnetic dosing funnel/dosing ring with magnets for 58mm portafilters; review exact selected size before saving.",
    },
  },
  {
    kind: "accessory",
    match: ["dosing cup", "dose cup", "b09s3pwhby"],
    label: "Dosing Cup",
    confidence: "User-confirmed",
    values: {
      type: "dosing_cup",
      brand: "",
      model: "Dosing Cup",
      size: "",
      notes: "User-confirmed current accessory from Amazon ASIN B09S3PWHBY. Tare weight: 68.7g. Review brand and size before saving.",
    },
  },
];

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchingSuggestions<T extends { match: string[] }>(suggestions: T[], input: string): T[] {
  const needle = normalise(input);
  if (!needle) return [];
  return suggestions.filter((suggestion) =>
    suggestion.match.some((term) => normalise(term).includes(needle) || needle.includes(normalise(term))),
  );
}
