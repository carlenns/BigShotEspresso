import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Settings as SettingsIcon, Coffee, Zap, Wrench, ClipboardList, Star, Milestone, Plus,
} from "lucide-react";
import {
  CURRENT_SYSTEM_PHASE_SETTINGS_KEY,
  SYSTEM_PHASE_EXPERIMENT_OPTIONS_SETTINGS_KEY,
  SYSTEM_PHASE_LABELS_SETTINGS_KEY,
  SYSTEM_PHASE_NAME_OPTIONS_SETTINGS_KEY,
  formatSystemPhase,
  parseCurrentSystemPhase,
  parsePhaseOptionMap,
  parseSystemPhaseLabels,
  removePhaseOption,
  serializeSystemPhaseLabels,
} from "@/lib/system-phases";
import {
  CURATED_SELECTOR_OPTIONS,
  CUSTOM_DRINK_TYPES_SETTINGS_KEY,
  parseCustomDrinkTypes,
  mergeDrinkTypeOptions,
} from "@/lib/selector-options";

// ── Settings form helpers ─────────────────────────────────────────────────────

function fetchSettings(): Promise<Record<string, string>> {
  return fetch("/api/settings").then((r) => r.json());
}

function saveSettings(body: Record<string, string>): Promise<{ ok: boolean }> {
  return fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle";
  options?: string[];
  placeholder?: string;
  unit?: string;
  note?: string;
};

type Grinder = { id: number; name: string; shortLabel: string | null; brand: string | null; model: string | null; type: string | null; isDefault: boolean };
type Machine = { id: number; name: string; shortLabel: string | null; brand: string | null; model: string | null; brewMethod: string | null; stockBasket: string | null; isDefault: boolean };
type Accessory = { id: number; type: string; shortLabel: string | null; brand: string | null; model: string | null; size: string | null; isActive: boolean; isDefault: boolean; specs: Record<string, unknown> | null };

function fetchGrinders(): Promise<Grinder[]> {
  return fetch("/api/equipment/grinders").then((r) => r.json());
}

function fetchMachines(): Promise<Machine[]> {
  return fetch("/api/equipment/machines").then((r) => r.json());
}

function fetchAccessories(): Promise<Accessory[]> {
  return fetch("/api/accessories").then((r) => r.json());
}

const SECTIONS: { title: string; icon: React.ElementType; description: string; fields: FieldDef[] }[] = [
  {
    title: "User Defaults",
    icon: SettingsIcon,
    description: "Brew Method is how a shot is extracted (e.g. Espresso). Drink Type is what you served (e.g. Americano, Latte). They are independent fields — new shots prefill each from its default below, and you can still change either one per shot.",
    fields: [
      { key: "brewMethod", label: "Default Brew Method", type: "select", options: CURATED_SELECTOR_OPTIONS.brewMethod, note: "How the shot is extracted — e.g. Espresso, Pour-over. Prefilled on new shots (a Machine's own Brew Method wins when set). Not the served drink." },
      { key: "defaultDrinkType", label: "Default Drink Type", type: "select", options: CURATED_SELECTOR_OPTIONS.drinkType },
    ],
  },
  {
    title: "Personal Score Weighting",
    icon: Star,
    description: "Controls how BSE ranks bags and beans. Technical Rating measures execution; Preference Rating measures how much you personally enjoyed it. These settings recalculate live and never change saved shot ratings.",
    fields: [
      { key: "ratingTechnicalWeight", label: "Technical Rating Weight", type: "number", placeholder: "40", unit: "%" },
      { key: "ratingPreferenceWeight", label: "Preference Rating Weight", type: "number", placeholder: "60", unit: "%" },
    ],
  },
  {
    title: "Espresso Recipe Defaults",
    icon: Coffee,
    description: "Default values pre-filled on new shot entries.",
    fields: [
      { key: "defaultDose", label: "Default Dose", type: "number", placeholder: "18", unit: "g" },
      { key: "defaultTargetYield", label: "Default Target Yield", type: "number", placeholder: "36", unit: "g" },
      { key: "defaultBrewTemp", label: "Default Brew Temperature", type: "number", placeholder: "94", unit: "°C" },
    ],
  },
  {
    title: "Grinder Defaults",
    icon: Zap,
    description: "Grind settings are carried forward until you change them.",
    fields: [
      { key: "defaultGrindSetting", label: "Default Grind Setting", type: "number", placeholder: "Your usual setting" },
      { key: "defaultGrindTime", label: "Default Grind Time", type: "number", placeholder: "e.g. 8", unit: "sec" },
      {
        key: "grindTimerMode", label: "Grind Output Measurement", type: "select",
        options: ["By Time", "By Weight", "Manual / Single Dose"],
        note: "Not yet used elsewhere in the app — reserved for future single-dose workflow support.",
      },
      { key: "grindMinTime", label: "Minimum Grind Time", type: "number", placeholder: "0.2", unit: "s" },
    ],
  },
  {
    title: "Shot Entry Behavior",
    icon: ClipboardList,
    description: "Controls how the new-shot form behaves.",
    fields: [
      { key: "autoFillDefaults", label: "Auto-fill defaults on new shot", type: "toggle" },
      { key: "rememberLastGrindSetting", label: "Carry forward changed grind setting/time", type: "toggle" },
      { key: "rememberLastTemperature", label: "Remember last temperature", type: "toggle" },
      { key: "rememberLastActiveBag", label: "Remember last selected bag", type: "toggle" },
      { key: "grindChangePrompt", label: "Prompt when grind setting changes", type: "toggle" },
    ],
  },
];

// ── Main Settings component ───────────────────────────────────────────────────

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: saved, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: grinders = [] } = useQuery({ queryKey: ["equipment", "grinders"], queryFn: fetchGrinders });
  const { data: machines = [] } = useQuery({ queryKey: ["equipment", "machines"], queryFn: fetchMachines });
  const { data: accessories = [] } = useQuery({ queryKey: ["accessories"], queryFn: fetchAccessories });
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saved) setValues(saved);
  }, [saved]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setDirty(false);
      toast({ title: "Settings saved", description: "Your defaults have been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
    },
  });

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => mutation.mutate(values);

  const customDrinkTypes = parseCustomDrinkTypes(values[CUSTOM_DRINK_TYPES_SETTINGS_KEY]);
  // Equipment defaults Option A (Phase 2A S5): the Equipment / Accessories
  // "Default" flag is the single source for machine, grinder, basket and puck screen.
  const defaultMachine = machines.find((m) => m.isDefault) ?? null;
  const defaultGrinder = grinders.find((g) => g.isDefault) ?? null;
  const defaultMachineLabel = defaultMachine ? defaultMachine.shortLabel || equipmentLabel(defaultMachine) : undefined;
  const defaultGrinderLabel = defaultGrinder ? defaultGrinder.shortLabel || equipmentLabel(defaultGrinder) : undefined;
  const addCustomDrinkType = (value: string) => {
    set(CUSTOM_DRINK_TYPES_SETTINGS_KEY, JSON.stringify([...customDrinkTypes, value]));
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Defaults &amp; Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure defaults pre-filled on new shot entries. These never overwrite recorded values.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Current Defaults Summary */}
      {!isLoading && Object.keys(values).length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider">Current Defaults Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
              {[
                ["Grinder", defaultGrinderLabel],
                ["Grind Setting", values.defaultGrindSetting],
                ["Grind Time", values.defaultGrindTime ? `${values.defaultGrindTime} sec` : undefined],
                ["Dose", values.defaultDose ? `${values.defaultDose}g` : undefined],
                ["Target Yield", values.defaultTargetYield ? `${values.defaultTargetYield}g` : undefined],
                ["Temperature", values.defaultBrewTemp ? `${values.defaultBrewTemp}°C` : undefined],
                ["Machine", defaultMachineLabel],
                ["Score Weighting", `${values.ratingTechnicalWeight || "40"}% technical / ${values.ratingPreferenceWeight || "60"}% preference`],
              ]
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div key={label as string} className="flex flex-wrap gap-x-1 min-w-0">
                    <span className="text-muted-foreground shrink-0">{label}:</span>
                    <span className="font-medium break-words">{val}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
        {SECTIONS.filter((section) => section.title !== "Equipment Defaults" && section.title !== "Grinder Defaults").map((section, si) => (
          <Card key={si}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  field.key === "defaultDrinkType" ? (
                    <DrinkTypeDefaultField
                      key={field.key}
                      value={values.defaultDrinkType ?? ""}
                      customDrinkTypes={customDrinkTypes}
                      onChangeValue={(v) => set("defaultDrinkType", v)}
                      onAddCustomType={addCustomDrinkType}
                    />
                  ) : (
                    <FieldControl
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? ""}
                      onChange={(v) => set(field.key, v)}
                    />
                  )
                ))}
              </div>
            </CardContent>
            {si < SECTIONS.length - 1 && <Separator />}
          </Card>
        ))}
        <GrinderDefaultsSection values={values} set={set} grinders={grinders} />
        <SystemPhasesSection values={values} set={set} />
        </>
      )}

      {!isLoading && (
        <EquipmentDefaultsSection
          values={values}
          grinders={grinders}
          machines={machines}
          accessories={accessories}
        />
      )}

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={!dirty || mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ── System Phases Section ─────────────────────────────────────────────────────
// Saved phase labels + the phase new shots start on. Numbers are permanent once
// added (shots store the number); names can be edited. Never rewrites shots.

function SystemPhasesSection({
  values,
  set,
}: {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
}) {
  const labels = parseSystemPhaseLabels(values[SYSTEM_PHASE_LABELS_SETTINGS_KEY]);
  const current = parseCurrentSystemPhase(values[CURRENT_SYSTEM_PHASE_SETTINGS_KEY]);
  const saveLabels = (next: typeof labels) => set(SYSTEM_PHASE_LABELS_SETTINGS_KEY, serializeSystemPhaseLabels(next));
  const nextNumber = Math.max(0, ...labels.map((l) => l.number)) + 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Milestone className="h-5 w-5 text-primary" />
          <CardTitle>System Phases</CardTitle>
        </div>
        <CardDescription>
          The machine/workflow learning era a shot belongs to — separate from Hopper Phase. New shots start on the
          Current System Phase; you can still change it per shot. Renaming a phase does not change saved shots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 max-w-sm">
          <Label>Current System Phase</Label>
          <Select
            value={current == null ? "none" : String(current)}
            onValueChange={(v) => set(CURRENT_SYSTEM_PHASE_SETTINGS_KEY, v)}
          >
            <SelectTrigger aria-label="Current System Phase"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default (leave blank on new shots)</SelectItem>
              {labels.map((l) => (
                <SelectItem key={l.number} value={String(l.number)}>{formatSystemPhase(labels, l.number)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Phase labels</Label>
          {labels.map((l) => (
            <div key={l.number} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">Phase {l.number}</span>
              <Input
                aria-label={`Phase ${l.number} name`}
                value={l.name}
                placeholder="Phase name"
                onChange={(e) => saveLabels(labels.map((x) => (x.number === l.number ? { ...x, name: e.target.value } : x)))}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => saveLabels([...labels, { number: nextNumber, name: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Phase {nextNumber}
          </Button>
          <p className="text-xs text-muted-foreground">Remember to Save Changes.</p>
        </div>

        <SavedPhaseOptions
          title="Saved Phase Names (modes)"
          labels={labels}
          map={parsePhaseOptionMap(values[SYSTEM_PHASE_NAME_OPTIONS_SETTINGS_KEY])}
          onChange={(next) => set(SYSTEM_PHASE_NAME_OPTIONS_SETTINGS_KEY, JSON.stringify(next))}
        />
        <SavedPhaseOptions
          title="Saved Experiments"
          labels={labels}
          map={parsePhaseOptionMap(values[SYSTEM_PHASE_EXPERIMENT_OPTIONS_SETTINGS_KEY])}
          onChange={(next) => set(SYSTEM_PHASE_EXPERIMENT_OPTIONS_SETTINGS_KEY, JSON.stringify(next))}
        />
      </CardContent>
    </Card>
  );
}

function SavedPhaseOptions({
  title,
  labels,
  map,
  onChange,
}: {
  title: string;
  labels: ReturnType<typeof parseSystemPhaseLabels>;
  map: ReturnType<typeof parsePhaseOptionMap>;
  onChange: (next: ReturnType<typeof parsePhaseOptionMap>) => void;
}) {
  const phases = Object.keys(map).map(Number).sort((a, b) => a - b);
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {phases.length === 0 ? (
        <p className="text-xs text-muted-foreground">None yet. Add them from Log Shot → Workflow Context with the + button.</p>
      ) : (
        phases.map((phase) => (
          <div key={phase} className="space-y-1">
            <p className="text-xs text-muted-foreground">{formatSystemPhase(labels, phase)}</p>
            <div className="flex flex-wrap gap-1.5">
              {map[String(phase)]!.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs">
                  {v}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${v} from Phase ${phase} options`}
                    onClick={() => onChange(removePhaseOption(map, phase, v))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))
      )}
      {phases.length > 0 && (
        <p className="text-xs text-muted-foreground">Removing an option only hides it from the selector; shots keep what they saved.</p>
      )}
    </div>
  );
}

// ── Equipment Defaults Section ────────────────────────────────────────────────

function equipmentLabel(item: { name?: string; brand: string | null; model: string | null; size?: string | null; specs?: Record<string, unknown> | null }) {
  if (item.name) return item.name;
  const specValues = item.specs
    ? Object.entries(item.specs)
      .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false && value !== "false")
      .map(([key, value]) => `${key}: ${String(value)}`)
    : [];
  return [item.brand, item.model, item.size, ...specValues].filter(Boolean).join(" — ") || "Unnamed";
}

function GrinderDefaultsSection({
  values,
  set,
  grinders,
}: {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  grinders: Grinder[];
}) {
  const fields = SECTIONS.find((section) => section.title === "Grinder Defaults")?.fields ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Grinder Defaults</CardTitle>
        </div>
        <CardDescription>Grind settings are carried forward until you change them.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(v) => set(field.key, v)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DrinkTypeDefaultField({
  value,
  customDrinkTypes,
  onChangeValue,
  onAddCustomType,
}: {
  value: string;
  customDrinkTypes: string[];
  onChangeValue: (value: string) => void;
  onAddCustomType: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const options = mergeDrinkTypeOptions(customDrinkTypes, value);

  const handleAdd = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    const existing = options.find((option) => option.toLowerCase() === trimmed.toLowerCase());
    if (!existing) onAddCustomType(trimmed);
    onChangeValue(existing ?? trimmed);
    setNewType("");
    setAdding(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Default Drink Type</Label>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setAdding((a) => !a)}
        >
          {adding ? "Cancel" : "Add Drink Type"}
        </Button>
      </div>
      <Select value={value || "__none__"} onValueChange={(v) => onChangeValue(v === "__none__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— not set —</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value
          ? "What you serve — separate from Brew Method. New shots prefill this and you can change it per shot."
          : "Not set — new shots leave Drink Type blank. Pick the drink you log most often to prefill it; there is no universal default."}
      </p>
      {adding && (
        <div className="flex gap-2 pt-1">
          <Input
            autoFocus
            value={newType}
            placeholder="e.g. Cortado"
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button type="button" size="sm" onClick={handleAdd}>Add</Button>
        </div>
      )}
    </div>
  );
}

function EquipmentDefaultsSection({
  values,
  grinders,
  machines,
  accessories,
}: {
  values: Record<string, string>;
  grinders: Grinder[];
  machines: Machine[];
  accessories: Accessory[];
}) {
  const machine = machines.find((m) => m.isDefault) ?? null;
  const grinder = grinders.find((g) => g.isDefault) ?? null;
  const active = accessories.filter((a) => a.isActive);
  const basket = active.find((a) => a.isDefault && a.type === "basket") ?? null;
  const puckScreen = active.find((a) => a.isDefault && a.type === "puck_screen") ?? null;
  const label = (row: { shortLabel: string | null } & Parameters<typeof equipmentLabel>[0]) => row.shortLabel || equipmentLabel(row);
  const rows: { name: string; value: string | null; note?: string; href: string; action: string }[] = [
    { name: "Espresso Machine", value: machine ? label(machine) : null, href: "/equipment", action: "Equipment" },
    { name: "Grinder", value: grinder ? label(grinder) : null, href: "/equipment", action: "Equipment" },
    {
      name: "Basket",
      value: basket ? label(basket) : machine?.stockBasket ?? null,
      note: !basket && machine?.stockBasket ? "machine's stock basket" : undefined,
      href: "/accessories",
      action: "Accessories",
    },
    { name: "Puck Screen", value: puckScreen ? label(puckScreen) : null, href: "/accessories", action: "Accessories" },
  ];
  const needsAttention = backfillNeedsAttention(values.equipmentDefaultsBackfill);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <CardTitle>Equipment Defaults</CardTitle>
        </div>
        <CardDescription>
          Log Shot and the Dashboard setup summary both use the record marked <span className="font-medium">Default</span> on
          the Equipment and Accessories pages. Change a default there — it's no longer set here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((row) => (
            <div key={row.name} className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{row.name}</dt>
                <dd className="text-sm font-medium break-words">
                  {row.value ?? <span className="text-muted-foreground font-normal">No default set</span>}
                  {row.note && <span className="text-xs text-muted-foreground font-normal"> ({row.note})</span>}
                </dd>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs shrink-0" asChild>
                <Link href={row.href}>{row.value ? "Change" : "Set"} on {row.action}</Link>
              </Button>
            </div>
          ))}
        </dl>
        {needsAttention.length > 0 && (
          <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <p className="font-medium">Some old Settings defaults couldn't be matched to a saved record:</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {needsAttention.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">Mark the right record as Default on the Equipment or Accessories page.</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Decaf and pour-over grinder defaults are deferred (not a launch need). Scale and tamper defaults were never used and are retired.
        </p>
      </CardContent>
    </Card>
  );
}

/** Human list of backfill outcomes the owner should resolve by hand (unmatched / ambiguous). */
function backfillNeedsAttention(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { outcomes?: { kind: string; label: string; from: string; matches?: number }[] };
    return (parsed.outcomes ?? [])
      .filter((o) => o.kind === "unmatched" || o.kind === "ambiguous")
      .map((o) => `${o.from.replace(/^default/, "")}: "${o.label}"${o.kind === "ambiguous" ? ` matches ${o.matches} records` : " matches no saved record"}`);
  } catch {
    return [];
  }
}

// ── Field control ─────────────────────────────────────────────────────────────

function FieldControl({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3 gap-4">
        <Label className="text-sm font-normal">{field.label}</Label>
        <Switch
          checked={value === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{field.label}</Label>
        <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— not set —</SelectItem>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.note && <p className="text-xs text-muted-foreground">{field.note}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.label}
        {field.unit ? <span className="text-muted-foreground ml-1 text-xs">({field.unit})</span> : ""}
      </Label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={field.type === "number" ? "any" : undefined}
      />
      {field.note && <p className="text-xs text-muted-foreground">{field.note}</p>}
    </div>
  );
}
