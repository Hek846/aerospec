import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsPatterns, PatternComparison, PatternHour } from '../api/analytics';
import './PatternsPanel.css';

interface PatternsPanelProps {
  data: AnalyticsPatterns | null;
  loading: boolean;
}

interface HourPoint {
  hour: string;
  avgPm25: number | null;
}

function formatHour(hour: number | null) {
  if (hour === null || hour === undefined) return '--';
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(date);
}

function formatMetric(value: number | null, precision = 1) {
  return value === null || value === undefined ? '--' : value.toFixed(precision);
}

function chartData(hourly: PatternHour[]): HourPoint[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const found = hourly.find(item => item.hour === hour);
    return {
      hour: String(hour).padStart(2, '0'),
      avgPm25: found?.avgPm25 ?? null,
    };
  });
}

function StatTile({ title, summary }: { title: string; summary: PatternComparison | null }) {
  return (
    <div className="patterns-stat">
      <span>{title}</span>
      <strong>{formatMetric(summary?.avgPm25 ?? null)} PM2.5</strong>
      <small>{formatMetric(summary?.avgScore ?? null, 0)} average score</small>
    </div>
  );
}

function Skeleton() {
  return (
    <section className="patterns-panel patterns-panel--loading" aria-label="Loading air patterns">
      <div className="patterns-panel__heading">
        <div className="patterns-skeleton patterns-skeleton--title" />
        <div className="patterns-panel__badges">
          <div className="patterns-skeleton patterns-skeleton--badge" />
          <div className="patterns-skeleton patterns-skeleton--badge" />
        </div>
      </div>
      <div className="patterns-skeleton patterns-skeleton--chart" />
      <div className="patterns-comparison">
        <div className="patterns-skeleton patterns-skeleton--tile" />
        <div className="patterns-skeleton patterns-skeleton--tile" />
      </div>
    </section>
  );
}

export function PatternsPanel({ data, loading }: PatternsPanelProps) {
  if (loading) return <Skeleton />;

  const points = chartData(data?.hourly ?? []);
  const hasData = points.some(point => point.avgPm25 !== null);

  return (
    <section className="patterns-panel" aria-label="Air quality patterns">
      <div className="patterns-panel__heading">
        <div>
          <p>Patterns</p>
          <h2>24-hour PM2.5 profile</h2>
        </div>
        <div className="patterns-panel__badges">
          <span>Best {formatHour(data?.bestHour ?? null)}</span>
          <span>Worst {formatHour(data?.worstHour ?? null)}</span>
        </div>
      </div>

      {hasData ? (
        <div className="patterns-panel__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(1)} ug/m3`}
                labelFormatter={(label) => `${label}:00`}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <Bar dataKey="avgPm25" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="patterns-panel__empty">
          No hourly pattern data yet.
        </div>
      )}

      <div className="patterns-comparison">
        <StatTile title="Weekday" summary={data?.weekday ?? null} />
        <StatTile title="Weekend" summary={data?.weekend ?? null} />
      </div>
    </section>
  );
}
