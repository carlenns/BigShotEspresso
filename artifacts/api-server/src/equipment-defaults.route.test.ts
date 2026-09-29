import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";
import { ensureRuntimeSchema } from "./lib/runtime-schema";
import { planEquipmentDefaultBackfill, resolveEquipmentDefaults } from "./lib/equipment-defaults";

after(stopServer);

const g = (id: number, name: string, isDefault = false) => ({ id, name, isDefault });

test("S5 plan: exact single match sets a default; conflicts, ambiguity and unknowns are reported, never guessed", () => {
  const out = planEquipmentDefaultBackfill({
    settings: { defaultMachine: "Profitec Go", defaultRegularGrinder: "Eureka", defaultBasket: "Go stock 18g", defaultPuckScreen: "Unknown screen" },
    machines: [{ id: 1, name: "Profitec Go", stockBasket: "Go stock 18g" }],
    grinders: [g(1, "Eureka"), g(2, "Eureka")],
    accessories: [{ id: 5, type: "puck_screen", brand: "Normcore", isActive: true }],
  });
  assert.deepEqual(out.map((o) => o.kind), ["set", "ambiguous", "stock-basket", "unmatched"]);

  const conflict = planEquipmentDefaultBackfill({
    settings: { defaultMachine: "Profitec Go" },
    machines: [{ id: 1, name: "Profitec Go" }, { id: 2, name: "Other", isDefault: true }],
    grinders: [], accessories: [],
  });
  assert.deepEqual(conflict.map((o) => o.kind), ["already-set"], "an existing Equipment default always wins");
});

test("S5 resolve: Dashboard defaults come from isDefault, basket falls back to the default machine's stock basket", () => {
  const r = resolveEquipmentDefaults(
    [g(1, "Eureka", true)],
    [{ id: 1, name: "Profitec Go", shortLabel: "Go", stockBasket: "Stock 18g", isDefault: true }],
    [{ id: 3, type: "puck_screen", brand: "Normcore", isDefault: true, isActive: true, specs: { thickness: "1.7mm" } },
     { id: 4, type: "basket", brand: "VST", isDefault: true, isActive: false }],
  );
  assert.deepEqual(r, { machine: "Go", grinder: "Eureka", basket: "Stock 18g", puckScreen: "Normcore Puck Screen 1.7mm", usePuckScreen: true });
  assert.deepEqual(resolveEquipmentDefaults([], [], []), { machine: null, grinder: null, basket: null, puckScreen: null, usePuckScreen: false });
});

test("S5 boot backfill runs once, sets matching defaults, and the Dashboard reads them", async () => {
  // Boot already ran once (harness) with no equipment → marker exists. Reset it to simulate the first deploy.
  await api("DELETE", "/settings/equipmentDefaultsBackfill");
  const machine = await api("POST", "/equipment/machines", { name: "Profitec Go", stockBasket: "Go stock 18g" });
  const grinder = await api("POST", "/equipment/grinders", { name: "Eureka Mignon" });
  const screen = await api("POST", "/accessories", { type: "puck_screen", brand: "Normcore", specs: { thickness: "1.7mm" } });
  assert.equal(machine.status, 201);
  await api("PUT", "/settings", { defaultMachine: "Profitec Go", defaultGrinder: "Eureka Mignon", defaultPuckScreen: "Normcore — thickness: 1.7mm", defaultBasket: "Go stock 18g" });
  await api("POST", "/bags", { bagName: "Equip Bag", isActive: true });

  await ensureRuntimeSchema();
  const machines = (await api("GET", "/equipment/machines")).json as { id: number; isDefault: boolean }[];
  assert.equal(machines.find((m) => m.id === machine.json.id)?.isDefault, true);
  const grinders = (await api("GET", "/equipment/grinders")).json as { id: number; isDefault: boolean }[];
  assert.equal(grinders.find((x) => x.id === grinder.json.id)?.isDefault, true);
  const accessories = (await api("GET", "/accessories")).json as { id: number; isDefault: boolean }[];
  assert.equal(accessories.find((a) => a.id === screen.json.id)?.isDefault, true);

  const report = JSON.parse((await api("GET", "/settings")).json.equipmentDefaultsBackfill);
  assert.deepEqual(report.outcomes.map((o: { kind: string }) => o.kind).sort(), ["set", "set", "set", "stock-basket"]);

  const dash = (await api("GET", "/dashboard/intelligence")).json.activeBag;
  assert.equal(dash.machine, "Profitec Go");
  assert.equal(dash.grinder, "Eureka Mignon");
  assert.equal(dash.basket, "Go stock 18g");
  assert.equal(dash.usePuckScreen, true);

  // Runs once: un-defaulting the grinder by hand is respected on the next boot.
  await api("PATCH", `/equipment/grinders/${grinder.json.id}`, { isDefault: false });
  await ensureRuntimeSchema();
  const again = (await api("GET", "/equipment/grinders")).json as { id: number; isDefault: boolean }[];
  assert.equal(again.find((x) => x.id === grinder.json.id)?.isDefault, false);
  // EQ-5 (2026-09-29, reverses the "left in place (inert)" call above): the
  // old Settings rows are now removed on boot, after the backfill has already
  // had its one chance to read them. resolveEquipmentDefaults() reads only
  // isDefault, so nothing is lost by deleting them.
  const settingsAfter = (await api("GET", "/settings")).json as Record<string, unknown>;
  for (const retired of ["defaultMachine", "defaultGrinder", "defaultRegularGrinder", "defaultBasket", "defaultBasketSize", "defaultPuckScreen"]) {
    assert.equal(settingsAfter[retired], undefined, `${retired} should have been removed`);
  }
});
