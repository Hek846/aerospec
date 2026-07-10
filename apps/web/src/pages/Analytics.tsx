import { useEffect, useMemo, useState } from 'react';
import {
  AnalyticsCalendar,
  AnalyticsFactors,
  AnalyticsMetric,
  AnalyticsPatterns,
  AnalyticsRange,
  AnalyticsTrends,
  getAnalyticsCalendar,
  getAnalyticsFactors,
  getAnalyticsPatterns,
  getAnalyticsTrends,
} from '../api/analytics';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { FactorsPanel } from '../components/FactorsPanel';
import { GradientHeader } from '../components/GradientHeader';
import { PatternsPanel } from '../components/PatternsPanel';
import { TrendChart } from '../components/TrendChart';
import { useHomes } from '../hooks/useData';
import './Analytics.css';

const RANGES: AnalyticsRange[] = ['day', 'week', 'month', 'year'];
const METRICS: AnalyticsMetric[] = ['score', 'pm25', 'pm10', 'co2', 'vocIndex', 'humidity', 'aqi'];

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  score: 'Score',
  pm25: 'PM2.5',
  pm10: 'PM10',
  co2: 'CO2',
  vocIndex: 'VOC',
  humidity: 'Humidity',
  aqi: 'AQI',
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function Analytics() {
  const homes = useHomes();
  const home = homes[0];
  const [range, setRange] = useState<AnalyticsRange>('week');
  const [metric, setMetric] = useState<AnalyticsMetric>('score');
  const [month, setMonth] = useState(currentMonth);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [calendar, setCalendar] = useState<AnalyticsCalendar | null>(null);
  const [patterns, setPatterns] = useState<AnalyticsPatterns | null>(null);
  const [factors, setFactors] = useState<AnalyticsFactors | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!home?.id) return;

    let alive = true;
    setLoadingTrends(true);
    setErrors(previous => previous.filter(error => !error.startsWith('Trend')));

    getAnalyticsTrends(home.id, range, metric)
      .then(result => {
        if (alive) setTrends(result);
      })
      .catch(err => {
        console.error('Failed to load analytics trends:', err);
        if (!alive) return;
        setTrends(null);
        setErrors(previous => [...previous.filter(error => !error.startsWith('Trend')), 'Trend data unavailable']);
      })
      .finally(() => {
        if (alive) setLoadingTrends(false);
      });

    return () => {
      alive = false;
    };
  }, [home?.id, metric, range]);

  useEffect(() => {
    if (!home?.id) return;

    let alive = true;
    setLoadingCalendar(true);
    setErrors(previous => previous.filter(error => !error.startsWith('Calendar')));

    getAnalyticsCalendar(home.id, month)
      .then(result => {
        if (alive) setCalendar(result);
      })
      .catch(err => {
        console.error('Failed to load analytics calendar:', err);
        if (!alive) return;
        setCalendar(null);
        setErrors(previous => [...previous.filter(error => !error.startsWith('Calendar')), 'Calendar data unavailable']);
      })
      .finally(() => {
        if (alive) setLoadingCalendar(false);
      });

    return () => {
      alive = false;
    };
  }, [home?.id, month]);

  useEffect(() => {
    if (!home?.id) return;

    let alive = true;
    setLoadingPatterns(true);
    setLoadingFactors(true);
    setErrors(previous => previous.filter(error => !error.startsWith('Pattern') && !error.startsWith('Factor')));

    getAnalyticsPatterns(home.id, '30d')
      .then(result => {
        if (alive) setPatterns(result);
      })
      .catch(err => {
        console.error('Failed to load analytics patterns:', err);
        if (!alive) return;
        setPatterns(null);
        setErrors(previous => [...previous.filter(error => !error.startsWith('Pattern')), 'Pattern data unavailable']);
      })
      .finally(() => {
        if (alive) setLoadingPatterns(false);
      });

    getAnalyticsFactors(home.id, '30d')
      .then(result => {
        if (alive) setFactors(result);
      })
      .catch(err => {
        console.error('Failed to load analytics factors:', err);
        if (!alive) return;
        setFactors(null);
        setErrors(previous => [...previous.filter(error => !error.startsWith('Factor')), 'Factor data unavailable']);
      })
      .finally(() => {
        if (alive) setLoadingFactors(false);
      });

    return () => {
      alive = false;
    };
  }, [home?.id]);

  const subtitle = useMemo(() => {
    if (!home) return 'Select a home to view Sleep Cycle-style air statistics';
    return `${home.name} · ${home.location.city}, ${home.location.region}`;
  }, [home]);

  return (
    <div className="analytics-page">
      <GradientHeader
        title="Analytics"
        subtitle={subtitle}
        rightSlot={
          <label className="analytics-metric-select">
            <span>Metric</span>
            <select value={metric} onChange={event => setMetric(event.target.value as AnalyticsMetric)}>
              {METRICS.map(option => (
                <option value={option} key={option}>{METRIC_LABELS[option]}</option>
              ))}
            </select>
          </label>
        }
      >
        <div className="analytics-range-control" role="group" aria-label="Trend range">
          {RANGES.map(option => (
            <button
              type="button"
              className={range === option ? 'analytics-range-control__button active' : 'analytics-range-control__button'}
              onClick={() => setRange(option)}
              key={option}
            >
              {option}
            </button>
          ))}
        </div>
      </GradientHeader>

      {errors.length > 0 && (
        <div className="analytics-errors" role="status">
          {errors.join(' · ')}
        </div>
      )}

      {!home && (
        <section className="analytics-empty-home">
          No home data is available for analytics yet.
        </section>
      )}

      <TrendChart
        data={trends}
        metric={metric}
        range={range}
        loading={loadingTrends}
      />

      <div className="analytics-grid">
        <CalendarHeatmap
          data={calendar}
          month={month}
          loading={loadingCalendar}
          onMonthChange={setMonth}
        />
        <PatternsPanel data={patterns} loading={loadingPatterns} />
      </div>

      <FactorsPanel data={factors} loading={loadingFactors} />
    </div>
  );
}
