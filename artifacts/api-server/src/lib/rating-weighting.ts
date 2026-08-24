export type RatingWeights = {
  technicalWeight: number;
  preferenceWeight: number;
};

const DEFAULT_WEIGHTS: RatingWeights = {
  technicalWeight: 40,
  preferenceWeight: 60,
};

function parseWeight(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

export function getRatingWeights(settings: Record<string, string>): RatingWeights {
  const technicalWeight = parseWeight(settings.ratingTechnicalWeight, DEFAULT_WEIGHTS.technicalWeight);
  const preferenceWeight = parseWeight(settings.ratingPreferenceWeight, DEFAULT_WEIGHTS.preferenceWeight);
  const total = technicalWeight + preferenceWeight;

  if (total <= 0) return DEFAULT_WEIGHTS;

  return {
    technicalWeight: Math.round((technicalWeight / total) * 100),
    preferenceWeight: Math.round((preferenceWeight / total) * 100),
  };
}

export function weightedShotScore(
  rating: number | string | null | undefined,
  preferenceRating: number | string | null | undefined,
  weights: RatingWeights,
): number | null {
  if (rating == null) return null;
  const technical = Number(rating);
  if (!Number.isFinite(technical)) return null;

  const preference = preferenceRating != null && Number.isFinite(Number(preferenceRating))
    ? Number(preferenceRating)
    : technical;

  return Math.round(
    ((technical * weights.technicalWeight) + (preference * weights.preferenceWeight)) / 100 * 100,
  ) / 100;
}

export function averageWeightedShotScore<T extends { rating: unknown; preferenceRating: unknown }>(
  shots: T[],
  weights: RatingWeights,
): number | null {
  const scores = shots
    .map((shot) => weightedShotScore(
      shot.rating as number | string | null | undefined,
      shot.preferenceRating as number | string | null | undefined,
      weights,
    ))
    .filter((score): score is number => score != null);

  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}
