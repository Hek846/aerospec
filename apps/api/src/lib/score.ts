export type ScoreMetric = 'pm25' | 'pm10' | 'co2' | 'vocIndex' | 'humidity';
export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';

export const SCORE_WEIGHTS: Record<ScoreMetric, number> = {
  pm25: 0.4,
  co2: 0.2,
  pm10: 0.15,
  vocIndex: 0.15,
  humidity: 0.1
};

export interface WeightedSubscore {
  metric: ScoreMetric;
  subscore: number;
  weight: number;
}

export interface CombinedScore {
  score: number | null;
  weights: WeightedSubscore[];
}

type Breakpoint = readonly [value: number, score: number];

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function interpolateScore(
  value: number | null | undefined,
  breakpoints: readonly Breakpoint[]
): number | null {
  if (!isValidNumber(value)) return null;

  const first = breakpoints[0]!;
  const last = breakpoints[breakpoints.length - 1]!;
  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];

  for (let i = 1; i < breakpoints.length; i += 1) {
    const lower = breakpoints[i - 1]!;
    const upper = breakpoints[i]!;
    if (value <= upper[0]) {
      const t = (value - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + t * (upper[1] - lower[1]);
    }
  }

  return last[1];
}

export function pm25Subscore(value: number | null | undefined): number | null {
  return interpolateScore(value, [
    [0, 100],
    [12, 75],
    [35.4, 50],
    [55.4, 25],
    [150.4, 0]
  ]);
}

export function pm10Subscore(value: number | null | undefined): number | null {
  return interpolateScore(value, [
    [0, 100],
    [54, 75],
    [154, 50],
    [254, 25],
    [354, 0]
  ]);
}

export function co2Subscore(value: number | null | undefined): number | null {
  return interpolateScore(value, [
    [600, 100],
    [1000, 75],
    [1500, 50],
    [2500, 25],
    [5000, 0]
  ]);
}

export function vocIndexSubscore(value: number | null | undefined): number | null {
  return interpolateScore(value, [
    [100, 100],
    [200, 75],
    [300, 50],
    [400, 25],
    [500, 0]
  ]);
}

export function humiditySubscore(value: number | null | undefined): number | null {
  if (!isValidNumber(value)) return null;
  if (value <= 10 || value >= 90) return 0;
  if (value >= 40 && value <= 60) return 100;
  if (value < 40) return ((value - 10) / 30) * 100;
  return ((90 - value) / 30) * 100;
}

export function metricSubscore(
  metric: ScoreMetric,
  value: number | null | undefined
): number | null {
  switch (metric) {
    case 'pm25':
      return pm25Subscore(value);
    case 'pm10':
      return pm10Subscore(value);
    case 'co2':
      return co2Subscore(value);
    case 'vocIndex':
      return vocIndexSubscore(value);
    case 'humidity':
      return humiditySubscore(value);
  }
}

export function combineSubscores(
  subscores: Partial<Record<ScoreMetric, number | null | undefined>>
): CombinedScore {
  const available = (Object.keys(SCORE_WEIGHTS) as ScoreMetric[])
    .map((metric) => ({ metric, subscore: subscores[metric] }))
    .filter(
      (entry): entry is { metric: ScoreMetric; subscore: number } =>
        isValidNumber(entry.subscore)
    );

  const weightTotal = available.reduce((sum, entry) => sum + SCORE_WEIGHTS[entry.metric], 0);
  if (weightTotal === 0) {
    return { score: null, weights: [] };
  }

  const weights = available.map((entry) => ({
    metric: entry.metric,
    subscore: entry.subscore,
    weight: SCORE_WEIGHTS[entry.metric] / weightTotal
  }));
  const score = weights.reduce((sum, entry) => sum + entry.subscore * entry.weight, 0);

  return { score, weights };
}

export function scoreBand(score: number | null | undefined): ScoreBand | null {
  if (!isValidNumber(score)) return null;
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'bad';
}
