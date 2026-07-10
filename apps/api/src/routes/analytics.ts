import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { getPool } from '../db/pool.js';
import { getHomeById, userHasHomeAccess } from '../db/queries.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  combineSubscores,
  metricSubscore,
  scoreBand,
  ScoreBand,
  ScoreMetric
} from '../lib/score.js';

const router: Router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const SCORE_METRICS = ['pm25', 'pm10', 'co2', 'vocIndex', 'humidity'] as const;
const TREND_METRICS = [...SCORE_METRICS, 'score', 'aqi'] as const;
const TREND_RANGES = ['day', 'week', 'month', 'year'] as const;
const PATTERN_RANGES = ['7d', '30d', '90d'] as const;

type TrendMetric = (typeof TREND_METRICS)[number];
type TrendRange = (typeof TREND_RANGES)[number];
type PatternRange = (typeof PATTERN_RANGES)[number];

interface HourlyStatsRow {
  device_id: string;
  hour: Date;
  avg_pm25: number | string | null;
  avg_pm10: number | string | null;
  avg_co2: number | string | null;
  avg_voc_index: number | string | null;
  avg_humidity: number | string | null;
  avg_aqi: number | string | null;
  reading_count: number | string;
}

interface HourlyStats {
  deviceId: string;
  hour: Date;
  values: Record<ScoreMetric, number | null> & { aqi: number | null };
  readingCount: number;
}

interface ScoreSummary {
  score: number | null;
  band: ScoreBand | null;
  breakdown: Array<{
    metric: ScoreMetric;
    subscore: number;
    weight: number;
    avgValue: number;
  }>;
  hoursWithData: number;
  worstMetric: ScoreMetric | null;
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundValue(value: number | null, digits = 1): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseUtcDate(raw: unknown, name: string): Date {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError(`${name} must be YYYY-MM-DD`, 400);
  }
  const [year, month, day] = raw.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(`${name} must be a valid calendar date`, 400);
  }
  return date;
}

function parseMonth(raw: unknown): { month: string; start: Date; end: Date; days: string[] } {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}$/.test(raw)) {
    throw new AppError('month must be YYYY-MM', 400);
  }
  const [year, monthNumber] = raw.split('-').map(Number) as [number, number];
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== monthNumber - 1) {
    throw new AppError('month must be a valid calendar month', 400);
  }
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const days: string[] = [];
  for (let ts = start.getTime(); ts < end.getTime(); ts += DAY_MS) {
    days.push(formatUtcDate(new Date(ts)));
  }
  return { month: raw, start, end, days };
}

function requireString(raw: unknown, name: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new AppError(`${name} is required`, 400);
  }
  return raw.trim();
}

function parseTrendRange(raw: unknown): TrendRange {
  if (!TREND_RANGES.includes(raw as TrendRange)) {
    throw new AppError('range must be day, week, month, or year', 400);
  }
  return raw as TrendRange;
}

function parseTrendMetric(raw: unknown): TrendMetric {
  if (!TREND_METRICS.includes(raw as TrendMetric)) {
    throw new AppError('metric must be score, pm25, pm10, co2, vocIndex, humidity, or aqi', 400);
  }
  return raw as TrendMetric;
}

function parsePatternRange(raw: unknown): PatternRange {
  const value = raw ?? '30d';
  if (!PATTERN_RANGES.includes(value as PatternRange)) {
    throw new AppError('range must be 7d, 30d, or 90d', 400);
  }
  return value as PatternRange;
}

async function ensureHomeAccess(req: AuthRequest, homeId: string): Promise<void> {
  if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
    throw new AppError('Access denied to this home', 403);
  }

  if (req.user!.role === 'admin' && !(await getHomeById(homeId))) {
    throw new AppError('Home not found', 404);
  }
}

async function queryHourlyStats(homeId: string, start: Date, end: Date): Promise<HourlyStats[]> {
  const result = await getPool().query<HourlyStatsRow>(
    `SELECT hds.device_id,
            hds.hour,
            hds.avg_pm25,
            hds.avg_pm10,
            hds.avg_co2,
            hds.avg_voc_index,
            hds.avg_humidity,
            hds.avg_aqi,
            hds.reading_count
       FROM hourly_device_stats hds
       JOIN devices d ON d.id = hds.device_id
      WHERE d.home_id = $1
        AND hds.hour >= $2
        AND hds.hour < $3
      ORDER BY hds.hour ASC, hds.device_id ASC`,
    [homeId, start, end]
  );

  return result.rows.map((row) => ({
    deviceId: row.device_id,
    hour: row.hour,
    values: {
      pm25: toNullableNumber(row.avg_pm25),
      pm10: toNullableNumber(row.avg_pm10),
      co2: toNullableNumber(row.avg_co2),
      vocIndex: toNullableNumber(row.avg_voc_index),
      humidity: toNullableNumber(row.avg_humidity),
      aqi: toNullableNumber(row.avg_aqi)
    },
    readingCount: Number(row.reading_count)
  }));
}

function rowSubscores(row: HourlyStats): Partial<Record<ScoreMetric, number | null>> {
  return {
    pm25: metricSubscore('pm25', row.values.pm25),
    pm10: metricSubscore('pm10', row.values.pm10),
    co2: metricSubscore('co2', row.values.co2),
    vocIndex: metricSubscore('vocIndex', row.values.vocIndex),
    humidity: metricSubscore('humidity', row.values.humidity)
  };
}

function rowScore(row: HourlyStats): number | null {
  return combineSubscores(rowSubscores(row)).score;
}

function summarizeRows(rows: HourlyStats[]): ScoreSummary {
  const byDevice = new Map<string, number[]>();
  const metricValues = new Map<ScoreMetric, number[]>();
  const metricSubscores = new Map<ScoreMetric, number[]>();
  const metricWeights = new Map<ScoreMetric, number[]>();
  const hourKeys = new Set<string>();

  for (const row of rows) {
    const subscores = rowSubscores(row);
    const combined = combineSubscores(subscores);
    if (combined.score === null) continue;

    hourKeys.add(row.hour.toISOString());
    const deviceScores = byDevice.get(row.deviceId) ?? [];
    deviceScores.push(combined.score);
    byDevice.set(row.deviceId, deviceScores);

    for (const item of combined.weights) {
      const rawValue = row.values[item.metric];
      if (rawValue === null) continue;
      metricValues.set(item.metric, [...(metricValues.get(item.metric) ?? []), rawValue]);
      metricSubscores.set(item.metric, [
        ...(metricSubscores.get(item.metric) ?? []),
        item.subscore
      ]);
      metricWeights.set(item.metric, [...(metricWeights.get(item.metric) ?? []), item.weight]);
    }
  }

  const deviceDailyScores = [...byDevice.values()]
    .map((scores) => average(scores))
    .filter((score): score is number => score !== null);
  const score = average(deviceDailyScores);

  const breakdown = SCORE_METRICS.map((metric) => {
    const avgValue = average(metricValues.get(metric) ?? []);
    const subscore = average(metricSubscores.get(metric) ?? []);
    const weight = average(metricWeights.get(metric) ?? []);
    if (avgValue === null || subscore === null || weight === null) return null;
    return {
      metric,
      subscore: roundValue(subscore)!,
      weight: roundValue(weight, 3)!,
      avgValue: roundValue(avgValue)!
    };
  }).filter(
    (
      item
    ): item is { metric: ScoreMetric; subscore: number; weight: number; avgValue: number } =>
      item !== null
  );

  const worstMetric =
    breakdown.length === 0
      ? null
      : breakdown.reduce((worst, item) => (item.subscore < worst.subscore ? item : worst))
          .metric;

  return {
    score: roundValue(score),
    band: scoreBand(score),
    breakdown,
    hoursWithData: hourKeys.size,
    worstMetric
  };
}

function bucketStart(date: Date, range: TrendRange): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  if (range === 'day') return new Date(Date.UTC(year, month, day, hour));
  if (range === 'week') return new Date(Date.UTC(year, month, day, Math.floor(hour / 6) * 6));
  if (range === 'month') return new Date(Date.UTC(year, month, day));

  const midnight = new Date(Date.UTC(year, month, day));
  const mondayOffset = (midnight.getUTCDay() + 6) % 7;
  return new Date(midnight.getTime() - mondayOffset * DAY_MS);
}

function bucketSizeMs(range: TrendRange): number {
  switch (range) {
    case 'day':
      return HOUR_MS;
    case 'week':
      return 6 * HOUR_MS;
    case 'month':
      return DAY_MS;
    case 'year':
      return 7 * DAY_MS;
  }
}

function trendWindow(range: TrendRange, now = new Date()): { start: Date; end: Date } {
  const days = range === 'day' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 365;
  return { start: new Date(now.getTime() - days * DAY_MS), end: now };
}

function metricValue(row: HourlyStats, metric: TrendMetric): number | null {
  if (metric === 'score') return rowScore(row);
  return row.values[metric];
}

function summarizeTrend(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return { avg: null, min: null, max: null, delta: null };
  }
  return {
    avg: roundValue(average(present)),
    min: roundValue(Math.min(...present)),
    max: roundValue(Math.max(...present)),
    delta: roundValue(present[present.length - 1]! - present[0]!)
  };
}

// GET /analytics/score?homeId&date=YYYY-MM-DD
router.get(
  '/score',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = requireString(req.query.homeId, 'homeId');
    const date = req.query.date
      ? parseUtcDate(req.query.date, 'date')
      : parseUtcDate(formatUtcDate(new Date()), 'date');
    const start = date;
    const end = new Date(start.getTime() + DAY_MS);

    await ensureHomeAccess(req, homeId);
    const summary = summarizeRows(await queryHourlyStats(homeId, start, end));

    res.json({
      homeId,
      date: formatUtcDate(start),
      score: summary.score,
      band: summary.band,
      breakdown: summary.breakdown,
      hoursWithData: summary.hoursWithData
    });
  })
);

// GET /analytics/trends?homeId&range=day|week|month|year&metric=score|...
router.get(
  '/trends',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = requireString(req.query.homeId, 'homeId');
    const range = parseTrendRange(req.query.range);
    const metric = parseTrendMetric(req.query.metric);

    await ensureHomeAccess(req, homeId);
    const { start, end } = trendWindow(range);
    const rows = await queryHourlyStats(homeId, start, end);
    const sizeMs = bucketSizeMs(range);
    const bucketValues = new Map<number, number[]>();

    for (const row of rows) {
      const value = metricValue(row, metric);
      if (value === null) continue;
      const key = bucketStart(row.hour, range).getTime();
      bucketValues.set(key, [...(bucketValues.get(key) ?? []), value]);
    }

    const points: Array<{ ts: string; value: number | null }> = [];
    for (
      let ts = bucketStart(start, range).getTime();
      ts <= bucketStart(end, range).getTime();
      ts += sizeMs
    ) {
      points.push({
        ts: new Date(ts).toISOString(),
        value: roundValue(average(bucketValues.get(ts) ?? []))
      });
    }

    res.json({
      homeId,
      range,
      metric,
      points,
      summary: summarizeTrend(points.map((point) => point.value))
    });
  })
);

// GET /analytics/calendar?homeId&month=YYYY-MM
router.get(
  '/calendar',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = requireString(req.query.homeId, 'homeId');
    const { month, start, end, days: monthDays } = parseMonth(req.query.month);

    await ensureHomeAccess(req, homeId);
    const rows = await queryHourlyStats(homeId, start, end);
    const rowsByDay = new Map<string, HourlyStats[]>();

    for (const row of rows) {
      const day = formatUtcDate(row.hour);
      rowsByDay.set(day, [...(rowsByDay.get(day) ?? []), row]);
    }

    const days = monthDays.map((date) => {
      const summary = summarizeRows(rowsByDay.get(date) ?? []);
      return {
        date,
        score: summary.score,
        band: summary.band,
        worstMetric: summary.worstMetric
      };
    });
    const daysWithScores = days.filter((day): day is typeof day & { score: number } => day.score !== null);
    const bestDay =
      daysWithScores.length === 0
        ? null
        : daysWithScores.reduce((best, day) => (day.score > best.score ? day : best)).date;
    const worstDay =
      daysWithScores.length === 0
        ? null
        : daysWithScores.reduce((worst, day) => (day.score < worst.score ? day : worst)).date;

    res.json({ homeId, month, days, bestDay, worstDay });
  })
);

// GET /analytics/patterns?homeId&range=7d|30d|90d
router.get(
  '/patterns',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = requireString(req.query.homeId, 'homeId');
    const range = parsePatternRange(req.query.range);
    const days = Number(range.slice(0, -1));

    await ensureHomeAccess(req, homeId);
    const end = new Date();
    const start = new Date(end.getTime() - days * DAY_MS);
    const rows = await queryHourlyStats(homeId, start, end);

    const byHour = new Map<number, { pm25: number[]; score: number[] }>();
    const weekday = { pm25: [] as number[], score: [] as number[] };
    const weekend = { pm25: [] as number[], score: [] as number[] };

    for (const row of rows) {
      const hour = row.hour.getUTCHours();
      const score = rowScore(row);
      const pm25 = row.values.pm25;
      const hourBucket = byHour.get(hour) ?? { pm25: [], score: [] };
      if (pm25 !== null) hourBucket.pm25.push(pm25);
      if (score !== null) hourBucket.score.push(score);
      byHour.set(hour, hourBucket);

      const day = row.hour.getUTCDay();
      const bucket = day === 0 || day === 6 ? weekend : weekday;
      if (pm25 !== null) bucket.pm25.push(pm25);
      if (score !== null) bucket.score.push(score);
    }

    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const values = byHour.get(hour) ?? { pm25: [], score: [] };
      return {
        hour,
        avgPm25: roundValue(average(values.pm25)),
        avgScore: roundValue(average(values.score))
      };
    });
    const scoredHours = hourly.filter(
      (item): item is typeof item & { avgScore: number } => item.avgScore !== null
    );
    const bestHour =
      scoredHours.length === 0
        ? null
        : scoredHours.reduce((best, item) => (item.avgScore > best.avgScore ? item : best)).hour;
    const worstHour =
      scoredHours.length === 0
        ? null
        : scoredHours.reduce((worst, item) => (item.avgScore < worst.avgScore ? item : worst))
            .hour;

    res.json({
      homeId,
      range,
      hourly,
      bestHour,
      worstHour,
      weekday: {
        avgPm25: roundValue(average(weekday.pm25)),
        avgScore: roundValue(average(weekday.score))
      },
      weekend: {
        avgPm25: roundValue(average(weekend.pm25)),
        avgScore: roundValue(average(weekend.score))
      }
    });
  })
);

// Contrast tagged annotation windows against the home's baseline for the same
// hours-of-day. This shows correlation, not causation.
const FACTORS_SQL = `
WITH tag_events AS (
  SELECT a.id, a.ts, UNNEST(a.tags) AS tag
    FROM annotations a
   WHERE a.home_id = $1
     AND a.ts >= $2
     AND a.ts < $3
),
windows AS (
  SELECT tag, ts, ts + INTERVAL '2 hours' AS end_ts
    FROM tag_events
),
hours AS (
  SELECT DISTINCT w.tag, EXTRACT(HOUR FROM h)::int AS hour
    FROM windows w,
         LATERAL generate_series(
           date_trunc('hour', w.ts),
           date_trunc('hour', w.end_ts),
           INTERVAL '1 hour'
         ) AS h
),
during AS (
  SELECT w.tag, AVG(COALESCE(sr.pm25_corr, sr.pm25_env)) AS avg_pm25
    FROM windows w
    JOIN devices d ON d.home_id = $1
    JOIN sensor_readings sr
      ON sr.device_id = d.id
     AND sr.ts >= w.ts
     AND sr.ts < w.end_ts
   GROUP BY w.tag
),
baseline AS (
  SELECT h.tag, AVG(COALESCE(sr.pm25_corr, sr.pm25_env)) AS avg_pm25
    FROM hours h
    JOIN devices d ON d.home_id = $1
    JOIN sensor_readings sr
      ON sr.device_id = d.id
     AND sr.ts >= $2
     AND sr.ts < $3
     AND EXTRACT(HOUR FROM sr.ts)::int = h.hour
   GROUP BY h.tag
)
SELECT t.tag,
       COUNT(DISTINCT t.id) AS events,
       d.avg_pm25 AS avg_pm25_during,
       b.avg_pm25 AS baseline_pm25
  FROM tag_events t
  LEFT JOIN during d ON d.tag = t.tag
  LEFT JOIN baseline b ON b.tag = t.tag
 GROUP BY t.tag, d.avg_pm25, b.avg_pm25
 ORDER BY t.tag
`;

interface FactorRow {
  tag: string;
  events: string;
  avg_pm25_during: number | null;
  baseline_pm25: number | null;
}

// GET /analytics/factors?homeId&range=7d|30d|90d
router.get(
  '/factors',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = requireString(req.query.homeId, 'homeId');
    const range = parsePatternRange(req.query.range);
    const days = Number(range.slice(0, -1));

    await ensureHomeAccess(req, homeId);

    const end = new Date();
    const start = new Date(end.getTime() - days * DAY_MS);

    const result = await getPool().query<FactorRow>(FACTORS_SQL, [homeId, start, end]);

    const factors = result.rows.map((row) => {
      const during = row.avg_pm25_during;
      const baseline = row.baseline_pm25;
      let deltaPct: number | null = null;
      if (during !== null && baseline !== null && baseline !== 0) {
        deltaPct = Math.round(((during - baseline) / baseline) * 1000) / 10;
      }
      return {
        tag: row.tag,
        events: Number(row.events),
        avgPm25During: during === null ? null : Math.round(during * 10) / 10,
        baselinePm25: baseline === null ? null : Math.round(baseline * 10) / 10,
        deltaPct
      };
    });

    res.json({ homeId, range, factors });
  })
);

export default router;
