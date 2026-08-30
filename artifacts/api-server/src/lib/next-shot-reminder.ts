export interface ReminderShot {
  id: number;
  initialGrindWeight: number | string | null;
  dose: number | string | null;
  pourDelay: number | string | null;
}

export interface ReminderRange {
  min: number;
  max: number;
  count: number;
}

export interface NextShotReminder {
  type: "grind_time" | "grind_setting";
  title: string;
  message: string;
  evidence: string;
  action: string;
  scope: string;
}

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const fmt = (value: number, decimals = 1): string => value.toFixed(decimals).replace(/\.0$/, "");

function recentInitialOutputReminder(
  shotsNewestFirst: readonly ReminderShot[],
  defaultTargetDose: number,
  bagLabel: string,
): NextShotReminder | null {
  const recent = shotsNewestFirst
    .map((shot) => {
      const initial = toNumber(shot.initialGrindWeight);
      const target = toNumber(shot.dose) ?? defaultTargetDose;
      if (initial == null || target == null || target <= 0) return null;
      return { id: shot.id, initial, target, delta: Math.round((initial - target) * 10) / 10 };
    })
    .filter((row): row is { id: number; initial: number; target: number; delta: number } => row != null)
    .slice(0, 2);

  if (recent.length < 2) return null;
  const direction = recent.every((row) => row.delta > 0.3) ? "high"
    : recent.every((row) => row.delta < -0.3) ? "low"
    : null;
  if (!direction) return null;

  const avgAbs = recent.reduce((sum, row) => sum + Math.abs(row.delta), 0) / recent.length;
  if (avgAbs > 0.8) return null;
  const grindTimeStep = avgAbs > 0.5 ? 0.2 : 0.1;
  const verb = direction === "high" ? "reducing" : "increasing";
  const action = direction === "high"
    ? `Consider reducing grind time by ${grindTimeStep.toFixed(1)}s before the next shot.`
    : `Consider increasing grind time by ${grindTimeStep.toFixed(1)}s before the next shot.`;

  return {
    type: "grind_time",
    title: "Next shot: check grind time",
    message: `Last 2 natural outputs on ${bagLabel} were ${direction} versus target.`,
    evidence: `Recent outputs: ${recent.map((row) => `${fmt(row.initial)}g`).join(", ")} vs target ${fmt(recent[0]!.target)}g.`,
    action,
    scope: `Bag-specific reminder from Initial Grinder Output; ${verb} time is a nudge, not an automatic change.`,
  };
}

function recentPourDelayReminder(
  shotsNewestFirst: readonly ReminderShot[],
  pourDelayRange: ReminderRange | null,
  bagLabel: string,
): NextShotReminder | null {
  if (!pourDelayRange || pourDelayRange.count < 3) return null;
  const recent = shotsNewestFirst
    .map((shot) => {
      const pourDelay = toNumber(shot.pourDelay);
      return pourDelay == null || pourDelay <= 0 ? null : { id: shot.id, pourDelay };
    })
    .filter((row): row is { id: number; pourDelay: number } => row != null)
    .slice(0, 3);

  if (recent.length < 3) return null;
  const below = recent.filter((row) => row.pourDelay < pourDelayRange.min);
  const above = recent.filter((row) => row.pourDelay > pourDelayRange.max);
  const latest = recent[0]!;
  const direction = below.length >= 2 && latest.pourDelay < pourDelayRange.min ? "finer"
    : above.length >= 2 && latest.pourDelay > pourDelayRange.max ? "coarser"
    : null;
  if (!direction) return null;

  return {
    type: "grind_setting",
    title: direction === "finer" ? "Next shot: consider grinding finer" : "Next shot: consider grinding coarser",
    message: `First pour delay has been ${direction === "finer" ? "faster" : "slower"} than ${bagLabel}'s sweet spot on 2 of the last 3 shots.`,
    evidence: `Recent delays: ${recent.map((row) => `${fmt(row.pourDelay)}s`).join(", ")} vs sweet spot ${fmt(pourDelayRange.min)}–${fmt(pourDelayRange.max)}s.`,
    action: direction === "finer"
      ? "Consider tightening the grind before the next shot."
      : "Consider loosening the grind before the next shot.",
    scope: "Bag-specific reminder from your own reference/high-rated shot window.",
  };
}

export function buildNextShotReminder(params: {
  shotsNewestFirst: readonly ReminderShot[];
  defaultTargetDose: number | null | undefined;
  pourDelayRange: ReminderRange | null;
  bagNumber: string | null | undefined;
  beanName: string | null | undefined;
}): NextShotReminder | null {
  const targetDose = params.defaultTargetDose ?? 18;
  const bagLabel = params.bagNumber ? `Bag #${params.bagNumber}` : params.beanName ?? "this bag";

  return recentInitialOutputReminder(params.shotsNewestFirst, targetDose, bagLabel)
    ?? recentPourDelayReminder(params.shotsNewestFirst, params.pourDelayRange, bagLabel);
}
