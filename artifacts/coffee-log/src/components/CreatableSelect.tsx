import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

/**
 * A selector you can add to: pick a saved option, or "Add new…" to type one.
 * `onCreate` is called for genuinely new values (case-insensitive) so the
 * caller can save them as future options; the value is selected either way.
 */
export function CreatableSelect({
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Choose…",
  addLabel = "Add new",
  inputPlaceholder,
  disabled,
  ariaLabel,
}: {
  value: string | null | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
  onCreate?: (value: string) => void;
  placeholder?: string;
  addLabel?: string;
  inputPlaceholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const existing = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    if (!existing) onCreate?.(trimmed);
    onChange(existing ?? trimmed);
    setDraft("");
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          aria-label={ariaLabel ? `New ${ariaLabel}` : undefined}
          value={draft}
          placeholder={inputPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); setAdding(false); }
          }}
        />
        <Button type="button" size="sm" className="shrink-0" onClick={commit} disabled={!draft.trim()}>Save</Button>
        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => setAdding(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        disabled={disabled}
        value={value ? value : NONE}
        // Radix Select can emit "" while its item list is changing (e.g. when the
        // System Phase changes); ignore it so a filled value is never wiped.
        onValueChange={(v) => { if (v === "") return; onChange(v === NONE ? undefined : v); }}
      >
        <SelectTrigger aria-label={ariaLabel} className="flex-1 min-w-0"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        disabled={disabled}
        onClick={() => { setDraft(""); setAdding(true); }}
        aria-label={`${addLabel}${ariaLabel ? ` ${ariaLabel}` : ""}`}
        title={addLabel}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
