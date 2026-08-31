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
      { key: "defaultBasketSize", label: "Default Basket Size", type: "select" },
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
      {
        key: "grindTimerMode", label: "Grind Output Measurement", type: "select",
        options: ["By Time", "By Weight", "Manual / Single Dose"],
        note: "Not yet used elsewhere in the app — reserved for future single-dose workflow support.",
      },
      { key: "grindMinTime", label: "Minimum Grind Time", type: "number", placeholder: "0.2", unit: "s" },
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
  const basketOptions = [
    ...machines
      .map((machine) => machine.stockBasket)
      .filter((stockBasket): stockBasket is string => Boolean(stockBasket)),
    ...accessories
      .filter((accessory) => accessory.isActive && accessory.type === "basket")
      .map((accessory) => equipmentLabel(accessory)),
  ];
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
                ["Grinder", values.defaultGrinder || values.defaultRegularGrinder],
                ["Grind Setting", values.defaultGrindSetting],
                ["Grind Time", values.defaultGrindTime ? `${values.defaultGrindTime} sec` : undefined],
                ["Dose", values.defaultDose ? `${values.defaultDose}g` : undefined],
                ["Target Yield", values.defaultTargetYield ? `${values.defaultTargetYield}g` : undefined],
                ["Temperature", values.defaultBrewTemp ? `${values.defaultBrewTemp}°C` : undefined],
                ["Machine", values.defaultMachine],
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
                  ) : field.key === "defaultBasketSize" ? (
                    <SettingsSelect
                      key={field.key}
                      label={field.label}
                      value={values.defaultBasketSize ?? values.defaultBasket ?? ""}
                      options={basketOptions}
                      onChange={(value) => {
                        set("defaultBasketSize", value);
                        set("defaultBasket", value);
                      }}
                      addHref="/accessories"
                      addLabel="Add Basket"
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
        </>
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
  const grinderOptions = grinders.map((grinder) => equipmentLabel(grinder));
  const fields = SECTIONS.find((section) => section.title === "Grinder Defaults")?.fields.filter((field) => field.key !== "defaultGrinder") ?? [];

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
          <SettingsSelect
            label="Default Grinder"
            value={values.defaultGrinder ?? values.defaultRegularGrinder ?? ""}
            options={grinderOptions}
            onChange={(value) => {
              set("defaultGrinder", value);
              set("defaultRegularGrinder", value);
            }}
            addHref="/equipment"
            addLabel="Add Grinder"
          />
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
  const stockBasketOptions = machines
    .map((machine) => machine.stockBasket)
    .filter((stockBasket): stockBasket is string => Boolean(stockBasket));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <CardTitle>Equipment Defaults</CardTitle>
        </div>
        <CardDescription>
          Choose from equipment and active accessories you have already entered. These feed the Dashboard setup summary and pre-fill accessory/basket workflows. The Machine and Grinder that Log Shot pre-selects come from whichever record is marked <span className="font-medium">Default</span> on the Equipment page, not from here.
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
            options={[...stockBasketOptions, ...accessoryOptions("basket")]}
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
