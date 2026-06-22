import { cn } from "@/lib/utils";

interface ChipSelectorProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function ChipSelector({ options, value, onChange, placeholder, className }: ChipSelectorProps) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {placeholder ?? "No options available yet. Data will appear after Airtable sync."}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
