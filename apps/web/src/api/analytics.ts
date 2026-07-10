const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

async function analyticsRequest<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
export type ScoreMetric = 'pm25' | 'pm10' | 'co2' | 'vocIndex' | 'humidity';
export type AnalyticsMetric = ScoreMetric | 'score' | 'aqi';
export type AnalyticsRange = 'day' | 'week' | 'month' | 'year';

export interface ScoreBreakdown {
  metric: ScoreMetric;
  subscore: number;
  weight: number;
  avgValue: number;
}

export interface DailyScore {
  homeId: string;
  date: string;
  score: number | null;
  band: ScoreBand | null;
  breakdown: ScoreBreakdown[];
  hoursWithData: number;
}

export interface TrendPoint {
  ts: string;
  value: number | null;
}

export interface TrendSummary {
  avg: number | null;
  min: number | null;
  max: number | null;
  delta: number | null;
}

export interface AnalyticsTrends {
  homeId: string;
  range: AnalyticsRange;
  metric: AnalyticsMetric;
  points: TrendPoint[];
  summary: TrendSummary;
}

export interface CalendarDay {
  date: string;
  score: number | null;
  band: ScoreBand | null;
  worstMetric: AnalyticsMetric | null;
}

export interface AnalyticsCalendar {
  days: CalendarDay[];
  bestDay: CalendarDay | null;
  worstDay: CalendarDay | null;
}

export interface PatternHour {
  hour: number;
  avgPm25: number | null;
  avgScore: number | null;
}

export interface PatternComparison {
  avgPm25: number | null;
  avgScore: number | null;
}

export interface AnalyticsPatterns {
  hourly: PatternHour[];
  bestHour: number | null;
  worstHour: number | null;
  weekday: PatternComparison | null;
  weekend: PatternComparison | null;
}

export interface FactorImpact {
  tag: string;
  events: number;
  avgPm25During: number | null;
  baselinePm25: number | null;
  deltaPct: number | null;
}

export interface AnalyticsFactors {
  factors: FactorImpact[];
}

export function getAnalyticsScore(homeId: string, date?: string): Promise<DailyScore> {
  const params = new URLSearchParams({ homeId });
  if (date) {
    params.set('date', date);
  }

  return analyticsRequest<DailyScore>(`/analytics/score?${params.toString()}`);
}

export function getAnalyticsTrends(
  homeId: string,
  range: AnalyticsRange,
  metric: AnalyticsMetric
): Promise<AnalyticsTrends> {
  const params = new URLSearchParams({ homeId, range, metric });

  return analyticsRequest<AnalyticsTrends>(`/analytics/trends?${params.toString()}`);
}

export function getAnalyticsCalendar(homeId: string, month: string): Promise<AnalyticsCalendar> {
  const params = new URLSearchParams({ homeId, month });

  return analyticsRequest<AnalyticsCalendar>(`/analytics/calendar?${params.toString()}`);
}

export function getAnalyticsPatterns(
  homeId: string,
  range: string = '30d'
): Promise<AnalyticsPatterns> {
  const params = new URLSearchParams({ homeId, range });

  return analyticsRequest<AnalyticsPatterns>(`/analytics/patterns?${params.toString()}`);
}

export function getAnalyticsFactors(
  homeId: string,
  range: string = '30d'
): Promise<AnalyticsFactors> {
  const params = new URLSearchParams({ homeId, range });

  return analyticsRequest<AnalyticsFactors>(`/analytics/factors?${params.toString()}`);
}
