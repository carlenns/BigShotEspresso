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
  Save, Settings as SettingsIcon, Coffee, Zap, Wrench, ClipboardList, Star,
} from "lucide-react";
import { FIELD_GROUPS } from "@/pages/QuickLog";
import { cn } from "@/lib/utils";

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
};

type Grinder = { id: number; name: string; brand: string | null; model: string | null; type: string | null; isDefault: boolean };
type Machine = { id: number; name: string; brand: string | null; model: string | null; brewMethod: string | null; isDefault: boolean };
type Accessory = { id: number; type: string; brand: string | null; model: string | null; size: string | null; isActive: boolean; isDefault: boolean };

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
    description: "General preferences for units, time format, and display.",
    fields: [
      { key: "brewMethod", label: "Default Brew Method", type: "select", options: ["Espresso", "Pour-over", "AeroPress", "French Press", "Moka Pot"] },
      { key: "ratingSystem", label: "Rating System", type: "select", options: ["0–10", "0–5", "0–100"] },
      { key: "ratingInputMode", label: "Rating Input Mode", type: "select", options: ["Easy Rating (1–10 stars)", "Precision Rating (0.00–10.00)"] },
      { key: "unitSystem", label: "Unit System", type: "select", options: ["Metric (g, ml)", "Imperial (oz)"] },
      { key: "timeFormat", label: "Time Format", type: "select", options: ["12hr", "24hr"] },
      { key: "temperatureUnit", label: "Temperature Unit", type: "select", options: ["°C", "°F"] },
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
      { key: "defaultBrewRatio", label: "Default Brew Ratio", type: "text", placeholder: "1:2" },
      { key: "defaultBrewTemp", label: "Default Brew Temperature", type: "number", placeholder: "94", unit: "°C" },
      { key: "defaultBasketSize", label: "Default Basket Size", type: "text", placeholder: "18g VST" },
      { key: "usePuckScreen", label: "Use Puck Screen by Default", type: "toggle" },
    ],
  },
  {
    title: "Grinder Defaults",
    icon: Zap,
    description: "Grind settings are carried forward until you change them.",
    fields: [
      { key: "defaultGrinder", label: "Default Grinder", type: "text", placeholder: "Eureka Magnifico" },
      { key: "defaultGrindSetting", label: "Default Grind Setting", type: "number", placeholder: "2.33" },
      { key: "defaultGrindTime", label: "Default Grind Time", type: "number", placeholder: "8.1", unit: "sec" },
      { key: "grindTimerMode", label: "Grind Output Measurement", type: "select", options: ["By Time", "By Weight", "Manual / Single Dose"] },
      { key: "grindMinTime", label: "Minimum Grind Time", type: "number", placeholder: "0.2", unit: "s" },
      { key: "grindTimeIncrement", label: "Grind Time Increment", type: "number", placeholder: "0.1", unit: "s" },
      { key: "grindScaleMin", label: "Grind Scale Minimum", type: "number", placeholder: "1" },
      { key: "grindScaleMax", label: "Grind Scale Maximum", type: "number", placeholder: "10" },
      { key: "grindStepIncrement", label: "Grind Step Increment", type: "text", placeholder: "0.33" },
      { key: "hopperTracking", label: "Hopper Fullness Tracking", type: "toggle" },
      { key: "defaultHopperFullness", label: "Default Hopper Fullness", type: "number", placeholder: "100", unit: "%" },
    ],
  },
  {
    title: "Equipment Defaults",
    icon: Wrench,
    description: "Your equipment setup, used to pre-fill shot entry forms.",
    fields: [
      { key: "defaultMachine", label: "Espresso Machine", type: "text", placeholder: "Profitec Go" },
      { key: "defaultRegularGrinder", label: "Regular Grinder", type: "text", placeholder: "Eureka Magnifico" },
      { key: "defaultDecafGrinder", label: "Decaf Grinder", type: "text", placeholder: "" },
      { key: "defaultPourOverGrinder", label: "Pour-over Grinder", type: "text", placeholder: "" },
      { key: "defaultBasket", label: "Default Basket", type: "text", placeholder: "18g VST" },
      { key: "defaultScale", label: "Default Scale", type: "text", placeholder: "" },
      { key: "defaultTamper", label: "Default Tamper", type: "text", placeholder: "" },
      { key: "defaultPuckScreen", label: "Default Puck Screen", type: "text", placeholder: "1.7mm" },
    ],
  },
  {
    title: "Shot Entry Behavior",
    icon: ClipboardList,
    description: "Controls how the new-shot form behaves.",
    fields: [
      { key: "autoFillDefaults", label: "Auto-fill defaults on new shot", type: "toggle" },
      { key: "rememberLastGrindSetting", label: "Remember last grind setting", type: "toggle" },
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
              {[
                ["Grinder", values.defaultGrinder || values.defaultRegularGrinder],
                ["Grind Setting", values.defaultGrindSetting],
                ["Grind Time", values.defaultGrindTime ? `${values.defaultGrindTime} sec` : undefined],
                ["Dose", values.defaultDose ? `${values.defaultDose}g` : undefined],
                ["Target Yield", values.defaultTargetYield ? `${values.defaultTargetYield}g` : undefined],
                ["Temperature", values.defaultBrewTemp ? `${values.defaultBrewTemp}°C` : undefined],
                ["Machine", values.defaultMachine],
                ["Score Weighting", `${values.ratingTechnicalWeight || "40"}% tech / ${values.ratingPreferenceWeight || "60"}% pref`],
              ]
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div key={label as string} className="flex gap-1">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium truncate">{val}</span>
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
        SECTIONS.filter((section) => section.title !== "Equipment Defaults").map((section, si) => (
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
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? ""}
                    onChange={(v) => set(field.key, v)}
                  />
                ))}
              </div>
            </CardContent>
            {si < SECTIONS.length - 1 && <Separator />}
          </Card>
        ))
      )}

      {!isLoading && (
        <EquipmentDefaultsSection
          values={values}
          set={set}
          grinders={grinders}
          machines={machines}
          accessories={accessories}
        />
      )}

      {/* ── Logging Preferences ───────────────────────────────────────────── */}
      <LoggingPreferencesSection values={values} set={set} />

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={!dirty || mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ── Equipment Defaults Section ────────────────────────────────────────────────

function equipmentLabel(item: { name?: string; brand: string | null; model: string | null; size?: string | null }) {
  if (item.name) return item.name;
  return [item.brand, item.model, item.size].filter(Boolean).join(" — ") || "Unnamed";
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
  addHref,
  addLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  addHref: string;
  addLabel: string;
}) {
  const uniqueOptions = Array.from(new Set(options.filter(Boolean)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
          <Link href={addHref}>{addLabel}</Link>
        </Button>
      </div>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose saved equipment…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— not set —</SelectItem>
          {value && !uniqueOptions.includes(value) && (
            <SelectItem value={value}>{value} · typed value</SelectItem>
          )}
          {uniqueOptions.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EquipmentDefaultsSection({
  values,
  set,
  grinders,
  machines,
  accessories,
}: {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  grinders: Grinder[];
  machines: Machine[];
  accessories: Accessory[];
}) {
  const activeAccessories = accessories.filter((accessory) => accessory.isActive);
  const accessoryOptions = (type: string) => activeAccessories
    .filter((accessory) => accessory.type === type)
    .map((accessory) => equipmentLabel(accessory));
  const grinderOptions = grinders.map((grinder) => equipmentLabel(grinder));
  const machineOptions = machines.map((machine) => equipmentLabel(machine));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <CardTitle>Equipment Defaults</CardTitle>
        </div>
        <CardDescription>
          Choose from equipment and active accessories you have already entered. These labels pre-fill future shot workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsSelect
            label="Espresso Machine"
            value={values.defaultMachine ?? ""}
            options={machineOptions}
            onChange={(value) => set("defaultMachine", value)}
            addHref="/equipment"
            addLabel="Add Machine"
          />
          <SettingsSelect
            label="Regular Grinder"
            value={values.defaultRegularGrinder ?? values.defaultGrinder ?? ""}
            options={grinderOptions}
            onChange={(value) => {
              set("defaultRegularGrinder", value);
              set("defaultGrinder", value);
            }}
            addHref="/equipment"
            addLabel="Add Grinder"
          />
          <SettingsSelect
            label="Decaf Grinder"
            value={values.defaultDecafGrinder ?? ""}
            options={grinderOptions}
            onChange={(value) => set("defaultDecafGrinder", value)}
            addHref="/equipment"
            addLabel="Add Grinder"
          />
          <SettingsSelect
            label="Pour-Over Grinder"
            value={values.defaultPourOverGrinder ?? ""}
            options={grinderOptions}
            onChange={(value) => set("defaultPourOverGrinder", value)}
            addHref="/equipment"
            addLabel="Add Grinder"
          />
          <SettingsSelect
            label="Default Basket"
            value={values.defaultBasket ?? values.defaultBasketSize ?? ""}
            options={accessoryOptions("basket")}
            onChange={(value) => {
              set("defaultBasket", value);
              set("defaultBasketSize", value);
            }}
            addHref="/accessories"
            addLabel="Add Basket"
          />
          <SettingsSelect
            label="Default Scale"
            value={values.defaultScale ?? ""}
            options={accessoryOptions("scale")}
            onChange={(value) => set("defaultScale", value)}
            addHref="/accessories"
            addLabel="Add Scale"
          />
          <SettingsSelect
            label="Default Tamper"
            value={values.defaultTamper ?? ""}
            options={accessoryOptions("tamper")}
            onChange={(value) => set("defaultTamper", value)}
            addHref="/accessories"
            addLabel="Add Tamper"
          />
          <SettingsSelect
            label="Default Puck Screen"
            value={values.defaultPuckScreen ?? ""}
            options={accessoryOptions("puck_screen")}
            onChange={(value) => set("defaultPuckScreen", value)}
            addHref="/accessories"
            addLabel="Add Puck Screen"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Typed legacy values remain selectable until you replace them with saved equipment records.
          User-specific active equipment will become stricter after accounts/OAuth are added.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Logging Preferences Section ───────────────────────────────────────────────

function LoggingPreferencesSection({
  values,
  set,
}: {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Logging Preferences</CardTitle>
        </div>
        <CardDescription>
          Choose which fields appear in Quick Log. Essential fields are on by default — enable extras when you want more detail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {FIELD_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="flex-1 h-px bg-border" />
              <p className="text-[10px] text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.fields.map((field) => {
                const key = `quickLog_${field.id}`;
                const val = values[key];
                const isOn = val === undefined ? field.defaultOn : val === "true";
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 gap-4 transition-colors",
                      isOn ? "bg-primary/5 border-primary/20" : "bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Label className="text-sm font-normal cursor-pointer truncate">
                        {field.label}
                      </Label>
                      {field.unit && (
                        <span className="text-[10px] text-muted-foreground shrink-0">({field.unit})</span>
                      )}
                    </div>
                    <Switch
                      checked={isOn}
                      onCheckedChange={(checked) => set(key, checked ? "true" : "false")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Quick Log always records the date and links to your active bag automatically.
          <br />
          <span className="text-[11px]">Grind Changed This Shot also appears automatically whenever Grind Setting is enabled.</span>
        </p>
      </CardContent>
    </Card>
  );
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
    </div>
  );
}
