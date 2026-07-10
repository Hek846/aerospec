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
