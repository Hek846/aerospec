import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalyticsMetric,
  AnalyticsRange,
  AnalyticsTrends,
  TrendSummary,
} from '../api/analytics';
import './TrendChart.css';

interface TrendChartProps {
  data: AnalyticsTrends | null;
  metric: AnalyticsMetric;
  range: AnalyticsRange;
  loading: boolean;
}

interface ChartPoint {
  label: string;
  value: number | null;
}

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  score: 'Score',
  pm25: 'PM2.5',
  pm10: 'PM10',
  co2: 'CO2',
  vocIndex: 'VOC',
  humidity: 'Humidity',
  aqi: 'AQI',
};

const METRIC_UNITS: Partial<Record<AnalyticsMetric, string>> = {
  pm25: 'ug/m3',
  pm10: 'ug/m3',
  co2: 'ppm',
  humidity: '%',
  vocIndex: 'index',
};

function formatPointTime(ts: string, range: AnalyticsRange) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;

  if (range === 'day') {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(date);
  }

  if (range === 'year') {
    return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function formatValue(value: number | null, metric: AnalyticsMetric) {
  if (value === null || value === undefined) return '--';
  const rounded = metric === 'humidity' || metric === 'score' || metric === 'aqi'
    ? Math.round(value).toString()
    : value.toFixed(1);
  const unit = METRIC_UNITS[metric];
  return unit ? `${rounded} ${unit}` : rounded;
}

function isDeltaImproving(metric: AnalyticsMetric, delta: number | null) {
  if (delta === null || delta === 0) return null;
  return metric === 'score' ? delta > 0 : delta < 0;
}

function summaryItems(summary: TrendSummary | null, metric: AnalyticsMetric) {
  return [
    { label: 'Average', value: formatValue(summary?.avg ?? null, metric) },
    { label: 'Minimum', value: formatValue(summary?.min ?? null, metric) },
    { label: 'Maximum', value: formatValue(summary?.max ?? null, metric) },
  ];
}

function Skeleton() {
  return (
    <div className="trend-panel trend-panel--loading" aria-label="Loading trend chart">
      <div className="trend-panel__heading">
        <div className="trend-skeleton trend-skeleton--title" />
        <div className="trend-skeleton trend-skeleton--pill" />
      </div>
      <div className="trend-skeleton trend-skeleton--chart" />
      <div className="trend-summary">
        {[0, 1, 2, 3].map(item => (
          <div className="trend-summary__item" key={item}>
            <div className="trend-skeleton trend-skeleton--label" />
            <div className="trend-skeleton trend-skeleton--value" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data, metric, range, loading }: TrendChartProps) {
  if (loading) return <Skeleton />;

  const points: ChartPoint[] = (data?.points ?? []).map(point => ({
    label: formatPointTime(point.ts, range),
    value: point.value,
  }));
  const hasData = points.some(point => point.value !== null && point.value !== undefined);
  const summary = data?.summary ?? null;
  const deltaImproving = isDeltaImproving(metric, summary?.delta ?? null);
  const deltaClass = deltaImproving === null
    ? 'trend-delta trend-delta--neutral'
    : deltaImproving
      ? 'trend-delta trend-delta--good'
      : 'trend-delta trend-delta--bad';

  return (
    <section className="trend-panel" aria-label={`${METRIC_LABELS[metric]} trend`}>
      <div className="trend-panel__heading">
        <div>
          <p>Trend</p>
          <h2>{METRIC_LABELS[metric]}</h2>
        </div>
        <span className="trend-panel__range">{range}</span>
      </div>

      {hasData ? (
        <div className="trend-panel__chart">
          <ResponsiveContainer width="100%" height="100%">
            {range === 'day' ? (
              <BarChart data={points} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(value) => formatValue(Number(value), metric)}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={points} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-bright)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary-bright)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(value) => formatValue(Number(value), metric)}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  fill="url(#analyticsTrendFill)"
                  connectNulls
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="trend-panel__empty">
          No trend data yet for this range.
        </div>
      )}

      <div className="trend-summary">
        {summaryItems(summary, metric).map(item => (
          <div className="trend-summary__item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
        <div className="trend-summary__item">
          <span>Delta</span>
          <strong className={deltaClass}>
            {summary?.delta === null || summary?.delta === undefined ? (
              '--'
            ) : (
              <>
                <span aria-hidden>{summary.delta > 0 ? '↑' : summary.delta < 0 ? '↓' : '-'}</span>
                {formatValue(Math.abs(summary.delta), metric)}
              </>
            )}
          </strong>
        </div>
      </div>
    </section>
  );
}
