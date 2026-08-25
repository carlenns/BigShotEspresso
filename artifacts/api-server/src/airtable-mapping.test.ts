import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapAirtableShotFields,
  singleAirtableLinkedId,
} from "./lib/airtable-mapping";

test("Airtable Shot mapping covers source fields without calculated fallbacks", () => {
  const mapped = mapAirtableShotFields({
    Date: "2026-06-24T03:30:00.000Z",
    "Bag Label": ["Bag 8"],
    "Days Since Open": 12,
    "Grinder Setting": 5.25,
    "Grind Time": 9.5,
    "Initial Output (g)": 17.8,
    "Total Output (g)": 18,
    "Dose (g)": 17.9,
    "Time Adj (sec)": 0.2,
    "Top-Up Grind (g)": 0.2,
    "Over Grind Removed (g)": 0.1,
    "Bean Delta": -18,
    "Grind Waste (g)": 0.1,
    "Beans Added (g)": 300,
    "Dose Correction Type": "Under → Top-Up",
    "Correction Amount (g)": 0.2,
    "Output Delta (g)": -0.2,
    Temp: 94,
    "Pour Delay": 8,
    "Pour Time (sec)": 32,
    "Flow Time (sec)": 27,
    "Yield (g)": 36,
    Ratio: "1:2.01",
    "Finished Shot": true,
    Rating: 9,
    "Preference Rating": 9.5,
    "Rating Difference": -0.5,
    "Average Rating and Preference Rating weighted to Preference": 9.25,
    Rated: true,
    "For Others": false,
    "Reference Shot": true,
    "Signature Shot": false,
    Sour: false,
    "Boundary Shot": true,
    "Drink Type": "Espresso",
    "Shot Status": "Good",
    "Shot Classification": ["Balanced", "Caramel Rich"],
    "Fault Status": ["Good"],
    "Bean Achievement": ["Daily Driver", "Guest Worthy"],
    "Reference Shot Type": "Historical reference label",
    "Expression Style": ["Balanced Comfort"],
    "Daily Driver Count": 1,
    "Include in Analysis": true,
    "Important to Intelligence": true,
    "Intelligence Lesson Type": ["Model Exception", "Flow Diagnostic"],
    Notes: "source note",
    "Sensory Notes": "sensory note",
    "Fault Notes": "fault note",
    "Bag Opened Date": "2026-06-12",
    "Hopper Phase": "Phase 2",
    "Hopper Fullness": 75,
    "Hopper %": 75,
    "Hopper Range": "50–75%",
    "Taste Zone": "Center",
    Zone: "Center",
    "Zone Score": 3,
    "Taste Score": 3,
    "Agreement %": 100,
    "Flow Score": 95,
    "Model Flag": "Match",
    "Time Gap (sec)": 1,
    "Scale Zone": "Center",
    "Flow Diagnostic": "Normal",
    "Pour Delay Window": "7–9",
    "Flow Time Window": "26–28",
    "Flow Time Offset (Scale)": 0,
    "Drift Delta (sec)": 0.5,
    "Shot Drift Status": "Stable",
    "Shot Quality Score": 92,
    "Shot Tier": "Elite",
    "Perfect Range Flag": "Yes",
    "Drift Warning": "Stable",
    "Hopper Zone": "High",
    "Hopper Drift Link": "No",
    "Hopper Impact Score": 0,
    "Hopper Correction Rule": "Imported Airtable output",
    "Action Suggestion": "No change",
    "Scale Calibration Reminder": "Imported reminder",
    "Bag Calibration Reminder": "Imported reminder",
    Calculation: "Sweet Zone",
    "Baseline Unaided Output (g)": 18,
    "Baseline Output Delta (g)": -0.2,
    "Actual Dose Error (g)": -0.1,
    "Hopper Threshold Flag": "Normal",
    "Hopper Behaviour": "Stable",
    "Hopper Severity": "Stable",
    "Top-Up Gap (g)": 0.2,
    "Top-Up Recommendation": "Imported recommendation",
    "Grinder Initial Output for Charts (16-19g)": 17.8,
    "Grind Adjusted": "Checked",
    "Shots Left (est)": 10,
  }, { includeInAnalysisFieldPresent: true });

  assert.equal(mapped.flowTime, 27);
  assert.deepEqual(mapped.shotClassification, ["Balanced", "Caramel Rich"]);
  assert.deepEqual(mapped.beanAchievement, ["Daily Driver", "Guest Worthy"]);
  assert.equal(mapped.referenceType, "Historical reference label");
  assert.equal(mapped.includeInAnalysis, true);
  assert.equal(mapped.topUpRecommendation, "Imported recommendation");
  assert.equal(mapped.rawRow && Object.keys(mapped.rawRow).length > 70, true);
});

test("Airtable mapping does not invent Include in Analysis", () => {
  const source = {
    Date: "2026-06-24T03:30:00.000Z",
    "Shot Status": "Good",
    "Fault Status": ["Good"],
  };

  assert.equal(
    mapAirtableShotFields(source, { includeInAnalysisFieldPresent: false }).includeInAnalysis,
    null,
  );
  assert.equal(
    mapAirtableShotFields(source, { includeInAnalysisFieldPresent: true }).includeInAnalysis,
    false,
  );
});

test("Airtable scalar multi-select evidence is preserved instead of guessed", () => {
  const mapped = mapAirtableShotFields({
    Date: "2026-06-24T03:30:00.000Z",
    "Fault Status": "Fault,Grinder Issue",
  }, { includeInAnalysisFieldPresent: true });

  assert.deepEqual(mapped.faultStatus, ["Fault,Grinder Issue"]);
});

test("Airtable linked-record fields reject unresolved cardinality", () => {
  assert.equal(singleAirtableLinkedId(["rec1"], "Bag"), "rec1");
  assert.throws(
    () => singleAirtableLinkedId(["rec1", "rec2"], "Bag"),
    /multiple linked records/,
  );
});
