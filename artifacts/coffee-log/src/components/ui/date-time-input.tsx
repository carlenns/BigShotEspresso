import { Input } from "@/components/ui/input";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function pad2(value: number | string): string {
  return String(value).padStart(2, "0");
}

function splitDateTime(value?: string | null): { date: string; hour: string; minute: string } {
  const [date = "", time = ""] = (value ?? "").split("T");
  const [hour = "", minute = ""] = time.split(":");
  return { date, hour, minute };
}

function joinDateTime(date: string, hour: string, minute: string): string {
  return `${date}T${pad2(hour || "0")}:${pad2(minute || "0")}`;
}

export function DateTimeInput({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const { date, hour, minute } = splitDateTime(value);

  const updateDate = (nextDate: string) => {
    if (!nextDate) return;
    onChange(joinDateTime(nextDate, hour, minute));
  };

  const updateHour = (nextHour: string) => {
    const normalizedHour = pad2(clamp(Number(nextHour), 0, 23));
    onChange(joinDateTime(date, normalizedHour, minute));
  };

  const updateMinute = (nextMinute: string) => {
    const normalizedMinute = pad2(clamp(Number(nextMinute), 0, 59));
    onChange(joinDateTime(date, hour, normalizedMinute));
  };

  return (
    <div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
      <Input
        type="date"
        value={date}
        onChange={(event) => updateDate(event.target.value)}
        className="h-10 text-sm tabular-nums"
        aria-label="Shot date"
      />
      <Input
        type="number"
        min={0}
        max={23}
        step={1}
        value={hour}
        onChange={(event) => updateHour(event.target.value)}
        className="h-10 text-sm tabular-nums"
        aria-label="Shot hour"
      />
      <Input
        type="number"
        min={0}
        max={59}
        step={1}
        value={minute}
        onChange={(event) => updateMinute(event.target.value)}
        className="h-10 text-sm tabular-nums"
        aria-label="Shot minute"
      />
    </div>
  );
}
