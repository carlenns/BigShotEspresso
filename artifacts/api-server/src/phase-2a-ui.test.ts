// Phase 2A UI contract checks (source-level, matching the api-contract.test.ts style).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ui = (rel: string) =>
  readFile(fileURLToPath(new URL(`../../coffee-log/src/${rel}`, import.meta.url)), "utf8");

test("PL-1: Shot Log is not highlighted on /shots/new, in the sidebar or the bottom nav", async () => {
  const shell = await ui("components/layout/Shell.tsx");
  assert.match(shell, /if \(item\.exclude\?\.includes\(location\)\) return false;/);
  // Both nav lists exclude /shots/new from Shot Log.
  assert.equal((shell.match(/href: "\/shots",\s+icon: BookOpen,[^\n]*exclude: \["\/shots\/new"\]/g) ?? []).length, 2);
  // The bottom nav uses the same helper instead of its own prefix match.
  assert.match(shell, /const isActive = isNavActive\(item, location\);/);
  assert.doesNotMatch(shell, /location\.startsWith\(item\.href\)\)/);
});

test("PL-6: Reference Shots has its own nav icon, not the Log Shot coffee cup", async () => {
  const shell = await ui("components/layout/Shell.tsx");
  assert.doesNotMatch(shell, /title: "Reference Shots", href: "\/reference",\s+icon: Coffee/);
  assert.match(shell, /title: "Reference Shots", href: "\/reference",\s+icon: Target/);
});

test("PL-2: list pages show an error state instead of rendering blank", async () => {
  const http = await ui("lib/http.ts");
  assert.match(http, /export async function getJson<T>/);
  assert.match(http, /if \(!response\.ok\) throw new Error/);
  for (const page of ["ReferenceShots", "Beans", "Bags", "Equipment", "Accessories", "TasteSelectors"]) {
    const source = await ui(`pages/${page}.tsx`);
    assert.match(source, /<QueryErrorState /, `${page} renders QueryErrorState`);
    assert.doesNotMatch(source, /fetch\("\/api\/(beans|bags|accessories|equipment\/grinders|equipment\/machines)"\)\.then\(\(r\) => r\.json\(\)\)/, `${page} list fetch throws on non-2xx`);
  }
});

test("PL-3: hopper phase starting amount uses one wording everywhere", async () => {
  const [dashboard, bags] = await Promise.all([ui("pages/Dashboard.tsx"), ui("pages/Bags.tsx")]);
  assert.match(dashboard, /starting beans \$\{hopper\.startingBeans\}g \(phase baseline\)/);
  assert.match(dashboard, /label="Starting beans \(phase baseline\)"/);
  assert.match(bags, /<Label>Starting beans \(phase baseline, g\)<\/Label>/);
  assert.doesNotMatch(dashboard + bags, /measured baseline|Starting Beans \/ Phase Baseline/);
});
