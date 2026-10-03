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

test("S6: React Query caches reference data but keeps dashboard intelligence live", async () => {
  const [client, app, equipment, dashboard, shotForm] = await Promise.all([
    ui("lib/query-client.ts"), ui("App.tsx"), ui("pages/Equipment.tsx"), ui("pages/Dashboard.tsx"), ui("pages/ShotForm.tsx"),
  ]);
  assert.match(client, /staleTime: REFERENCE_STALE_TIME_MS,\s*refetchOnWindowFocus: false,/);
  assert.match(client, /export const LIVE_QUERY_KEYS = \[\["dashboard-intelligence"\], \["intelligence"\]\] as const;/);
  assert.match(client, /mutationCache: new MutationCache\(\{\s*onSuccess: \(\) => \{\s*for \(const queryKey of LIVE_QUERY_KEYS\)/);
  assert.match(app, /const queryClient = createQueryClient\(\);/);
  assert.match(dashboard, /queryKey: \["dashboard-intelligence"\],\s*queryFn: fetchIntelligence,\s*\.\.\.LIVE_QUERY_OPTIONS,/);
  assert.match(shotForm, /queryKey: \["intelligence"\], queryFn: fetchActiveBagIntelligence, \.\.\.LIVE_QUERY_OPTIONS/);
  // Equipment page shares cache keys with Log Shot / Settings, so an edit there invalidates them.
  assert.doesNotMatch(equipment, /queryKey: \["grinders"\]|queryKey: \["machines"\]/);
});

test("PL-5: Bags dialogs lead with one short line and tuck the long explanation into a collapsible", async () => {
  const bags = await ui("pages/Bags.tsx");
  assert.match(bags, /<summary[^>]*>What closing a bag does<\/summary>/);
  assert.match(bags, /<summary[^>]*>What is a hopper phase\?<\/summary>/);
  assert.match(bags, /Record the beans you're <strong>adding now<\/strong>\. You don't need to empty the hopper first\./);
});

test("PL-8: switching bags re-seeds only fields the form itself filled", async () => {
  const form = await ui("pages/ShotForm.tsx");
  assert.match(form, /const seededRecipeValues = useRef\(new Map<string, number>\(\)\);/);
  assert.match(form, /const untouched = !blank && seededRecipeValues\.current\.has\(name\) && Number\(current\) === seededRecipeValues\.current\.get\(name\);/);
});

// B2 (found in the 2026-10-02 browser walkthrough): focusing an empty NumberStepper that has a
// suggested value (e.g. Rating, suggested 7) pre-fills it, so typing "8.5" on a desktop browser
// appended to the hidden 7 and produced 78.5. The first edit after seeding must replace the
// seeded value, while the pre-fill (and its mobile +/- base) stays.
test("B2: the first edit after a NumberStepper seeds a suggested value replaces it instead of appending", async () => {
  const form = await ui("pages/ShotForm.tsx");
  assert.match(form, /const seededRef = useRef<string \| null>\(null\);/);
  assert.match(form, /if \(wasEmpty && target\.value !== ""\) seededRef\.current = target\.value;/);
  assert.match(form, /while \(p < seeded\.length && raw\[p\] === seeded\[p\]\) p\+\+;/);
  assert.match(form, /if \(raw\.slice\(0, p\) \+ raw\.slice\(p \+ inserted\.length\) === seeded\) raw = inserted;/);
  // The memory is cleared on +/- and on blur so it can never misfire later.
  assert.match(form, /const adjust = \(direction: 1 \| -1\) => \{\s+seededRef\.current = null;/);
  assert.match(form, /onBlur=\{\(\) => \{ seededRef\.current = null; \}\}/);
  assert.match(form, /onChange=\{handleChange\}/);
  // Rating keeps its suggested starting value.
  assert.match(form, /<NumberStepper field=\{field\} step=\{0\.05\} min=\{0\} max=\{10\} suggestedValue=\{7\}/);
});

// 2026-10-02 (Carl): a new tester enters their own machine info; the owner's grinder values are not built in.
test("Log Shot has no built-in grinder setting or grind time (they start empty for a new user)", async () => {
  const form = await ui("pages/ShotForm.tsx");
  assert.doesNotMatch(form, /Number\(settings\.defaultGrindSetting\) : 2\.33/);
  assert.doesNotMatch(form, /Number\(settings\.defaultGrindTime\) : 8\.1/);
  assert.match(form, /Number\(settings\.defaultGrindSetting\) : undefined/);
  assert.match(form, /Number\(settings\.defaultGrindTime\) : undefined/);
  // The empty case still renders a usable placeholder instead of crashing on undefined.
  assert.match(form, /defaultGrindSetting\?\.toString\(\) \?\? "Your setting"/);
  assert.match(form, /defaultGrindTime\?\.toString\(\) \?\? "Seconds"/);
  const settings = await ui("pages/Settings.tsx");
  assert.doesNotMatch(settings, /placeholder: "2\.33"/);
  assert.doesNotMatch(settings, /placeholder: "8\.1"/);
});

test("User-facing wording: 'dialed in' is spelled the American way, and error messages read as sentences", async () => {
  const dashboard = await readFile(fileURLToPath(new URL("./routes/dashboard.ts", import.meta.url)), "utf8");
  assert.match(dashboard, /Bag dialed in/);
  assert.doesNotMatch(dashboard, /dialled/i);
  const hopper = await readFile(fileURLToPath(new URL("./routes/hopper.ts", import.meta.url)), "utf8");
  assert.match(hopper, /Pick a different phase, or edit the existing one\./);
  const shots = await readFile(fileURLToPath(new URL("./routes/shots.ts", import.meta.url)), "utf8");
  assert.match(shots, /A shot date is required\./);
  assert.match(shots, /Bag ID must be a whole number\./);
});

// 2026-10-02 (Carl): For Others always means Not Rated. Ticking For Others ticks Not Rated; unticking
// Not Rated also unticks For Others; unticking For Others leaves Not Rated alone (Not Rated can stand
// alone). Did Not Finish is independent of both.
test("Serving Context: For Others implies Not Rated one way only, and Did Not Finish is independent", async () => {
  const form = await ui("pages/ShotForm.tsx");
  const forOthers = form.match(/name="isForOthers"[\s\S]*?\)\} \/>/)?.[0] ?? "";
  assert.match(forOthers, /if \(forOthers\) form\.setValue\("rated", false\);/);
  assert.doesNotMatch(forOthers, /else|!forOthers/, "unticking For Others must not change Not Rated");
  const notRated = form.match(/name="rated"[\s\S]*?\)\} \/>/)?.[0] ?? "";
  assert.match(notRated, /if \(!notRated\) form\.setValue\("isForOthers", false\);/);
  const didNotFinish = form.match(/name="finishedShot"[\s\S]*?\)\} \/>/)?.[0] ?? "";
  assert.doesNotMatch(didNotFinish, /setValue\(/, "Did Not Finish is independent");
  assert.match(form, /For Others always means Not Rated, so unticking Not Rated also unticks For Others\./);
});

// 2026-10-02 (Carl): ratings are switched off while Not Rated is ticked, instead of being silently dropped on save.
test("Rating boxes are disabled while Not Rated is ticked, with an explanation", async () => {
  const form = await ui("pages/ShotForm.tsx");
  assert.match(form, /const notRated = form\.watch\("rated"\) === false;/);
  assert.match(form, /disabled=\{notRated\}\s+value=\{\[asNumber\(field\.value\) \?\? 7\]\}/);
  assert.match(form, /<NumberStepper field=\{field\} step=\{0\.05\} min=\{0\} max=\{10\} suggestedValue=\{7\} disabled=\{notRated\}/);
  assert.match(form, /<NumberStepper field=\{field\} step=\{0\.05\} min=\{0\} max=\{11\} disabled=\{notRated\}/);
  assert.match(form, /Ratings are off while Not Rated is ticked\./);
  // The disabled prop reaches the input and both +/- buttons.
  assert.equal((form.match(/disabled=\{disabled\}/g) ?? []).length, 3);
  // A disabled box must not pre-fill its suggested value when clicked.
  assert.match(form, /if \(disabled\) return;\s+const target = event\.currentTarget;/);
});

test("Data Health is not in the navigation any more, but its page and route still exist", async () => {
  const shell = await ui("components/layout/Shell.tsx");
  assert.doesNotMatch(shell, /data-health/);
  const app = await ui("App.tsx");
  assert.match(app, /path="\/data-health"/);
});

// 2026-10-02 (Carl): first-run wording on Bags, and an accurate Settings note about decaf / pour-over grinders.
test("Bags help text names the button the user actually sees, and Settings describes decaf and pour-over grinders accurately", async () => {
  const bags = await ui("pages/Bags.tsx");
  assert.match(bags, /activeBags\.length > 0 \? \(\s*<>\s*Switching coffees\? Tap <span className="font-medium text-foreground">Change Bag<\/span> above for the guided flow\./);
  assert.match(bags, /Starting out\? Tap <span className="font-medium text-foreground">Start New Bag<\/span> above/);
  const settings = await ui("pages/Settings.tsx");
  assert.doesNotMatch(settings, /Decaf and pour-over grinder defaults are deferred \(not a launch need\)/);
  assert.match(settings, /Decaf and pour-over grinders can be added on the Equipment page and chosen per shot in Log Shot\./);
  assert.match(settings, /Only one grinder is the default at a time; separate defaults per grinder type are not built yet\./);
});
