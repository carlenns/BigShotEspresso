import assert from "node:assert/strict";
import { test } from "node:test";

import { buildNextShotReminder, type ReminderShot } from "./lib/next-shot-reminder";

const shot = (over: Partial<ReminderShot> & { id: number }): ReminderShot => ({
  initialGrindWeight: null,
  dose: 18,
  pourDelay: null,
  ...over,
});

test("Next Shot Reminder suggests a 0.1s grind-time reduction for repeated 0.3-0.5g high natural output", () => {
  const reminder = buildNextShotReminder({
    shotsNewestFirst: [
      shot({ id: 3, initialGrindWeight: 18.4 }),
      shot({ id: 2, initialGrindWeight: 18.5 }),
      shot({ id: 1, initialGrindWeight: 18.0 }),
    ],
    defaultTargetDose: 18,
    pourDelayRange: null,
    bagNumber: "7",
    beanName: "De Luca's — Authentic Espresso",
  });

  assert.equal(reminder?.type, "grind_time");
  assert.match(reminder?.message ?? "", /Last 2 natural outputs on Bag #7 were high/);
  assert.match(reminder?.action ?? "", /reducing grind time by 0\.1s/);
  assert.match(reminder?.evidence ?? "", /18\.4g, 18\.5g vs target 18g/);
});

test("Next Shot Reminder suggests a 0.2s grind-time change for repeated 0.6-0.8g misses", () => {
  const high = buildNextShotReminder({
    shotsNewestFirst: [shot({ id: 2, initialGrindWeight: 18.7 }), shot({ id: 1, initialGrindWeight: 18.6 })],
    defaultTargetDose: 18,
    pourDelayRange: null,
    bagNumber: "7",
    beanName: null,
  });
  assert.match(high?.action ?? "", /reducing grind time by 0\.2s/);

  const low = buildNextShotReminder({
    shotsNewestFirst: [shot({ id: 2, initialGrindWeight: 17.3 }), shot({ id: 1, initialGrindWeight: 17.4 })],
    defaultTargetDose: 18,
    pourDelayRange: null,
    bagNumber: "7",
    beanName: null,
  });
  assert.match(low?.action ?? "", /increasing grind time by 0\.2s/);
});

test("Next Shot Reminder uses bag-specific sweet-spot windows for repeated first-pour drift", () => {
  const reminder = buildNextShotReminder({
    shotsNewestFirst: [
      shot({ id: 4, initialGrindWeight: 18.0, pourDelay: 6.0 }),
      shot({ id: 3, initialGrindWeight: 18.0, pourDelay: 6.2 }),
      shot({ id: 2, initialGrindWeight: 18.0, pourDelay: 7.4 }),
      shot({ id: 1, initialGrindWeight: 18.0, pourDelay: 7.6 }),
    ],
    defaultTargetDose: 18,
    pourDelayRange: { min: 7, max: 8, count: 4 },
    bagNumber: "7",
    beanName: null,
  });

  assert.equal(reminder?.type, "grind_setting");
  assert.match(reminder?.title ?? "", /grinding finer/);
  assert.match(reminder?.evidence ?? "", /6s, 6\.2s, 7\.4s vs sweet spot 7–8s/);
});

test("Next Shot Reminder stays quiet on one-off misses or insufficient sweet-spot evidence", () => {
  assert.equal(buildNextShotReminder({
    shotsNewestFirst: [shot({ id: 2, initialGrindWeight: 18.4 }), shot({ id: 1, initialGrindWeight: 18.0 })],
    defaultTargetDose: 18,
    pourDelayRange: null,
    bagNumber: "7",
    beanName: null,
  }), null);

  assert.equal(buildNextShotReminder({
    shotsNewestFirst: [
      shot({ id: 3, initialGrindWeight: 18.0, pourDelay: 6.0 }),
      shot({ id: 2, initialGrindWeight: 18.0, pourDelay: 6.1 }),
      shot({ id: 1, initialGrindWeight: 18.0, pourDelay: 6.2 }),
    ],
    defaultTargetDose: 18,
    pourDelayRange: { min: 7, max: 8, count: 2 },
    bagNumber: "7",
    beanName: null,
  }), null);
});
