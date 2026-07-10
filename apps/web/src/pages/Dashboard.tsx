import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDevices, useHomes, useRooms } from '../hooks/useData';
import { api } from '../lib/api';
import type { AlertEvent, AlertRule, Device, SensorReading } from '../types';
import { getAQIBand, getAQIBandInfo } from '../utils/aqi';
import { AQIGauge } from '../components/AQIGauge';
import { ScoreRing } from '../components/ScoreRing';
import { MetricCard } from '../components/MetricCard';
import { DeviceCard } from '../components/DeviceCard';
import { ExportButton } from '../components/ExportButton';
import { GradientHeader } from '../components/GradientHeader';
import { AnnotationDialog } from '../components/AnnotationDialog';
import {
  DailyScore,
  ScoreBreakdown,
  TrendPoint,
  getAnalyticsScore,
  getAnalyticsTrends,
} from '../api/analytics';
import './Dashboard.css';

interface MetricSummary {
  key: keyof Pick<SensorReading, 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co2' | 'vocIndex'>;
  label: string;
  unit: string;
  icon: string;
  precision: number;
  statusMetric?: 'pm25' | 'pm10';
  optional?: boolean;
}

interface TrendChartPoint {
  time: string;
  value: number | null;
}

const METRIC_SUMMARIES: MetricSummary[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', precision: 1 },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', icon: '💨', precision: 1, statusMetric: 'pm25' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: '💨', precision: 1, statusMetric: 'pm10' },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: '💧', precision: 0 },
  { key: 'co2', label: 'CO₂', unit: 'ppm', icon: '💨', precision: 0, optional: true },
  { key: 'vocIndex', label: 'VOC', unit: 'index', icon: '🧪', precision: 0, optional: true },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageMetric(devices: Device[], key: MetricSummary['key']) {
  const values = devices
    .map(device => device.latestReading?.[key])
    .filter((value): value is number => value !== null && value !== undefined);

  return average(values);
}

function metricStatus(
  metric: MetricSummary['statusMetric'],
  value: number | null
): 'good' | 'warning' | 'alert' {
  if (value === null || !metric) return 'good';

  const thresholds = {
    pm25: { warning: 35, alert: 55 },
    pm10: { warning: 150, alert: 250 },
  }[metric];

  if (value >= thresholds.alert) return 'alert';
  if (value >= thresholds.warning) return 'warning';
  return 'good';
}

function formatMetricValue(value: number | null, precision: number) {
  return value === null ? '—' : value.toFixed(precision);
}

function metricLabel(metric: string) {
  const labels: Record<string, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    co2: 'CO₂',
    vocIndex: 'VOC',
    humidity: 'Humidity',
  };

  return labels[metric] ?? metric;
}

function scoreChipBand(subscore: number) {
  if (subscore >= 80) return 'good';
  if (subscore >= 60) return 'moderate';
  if (subscore >= 40) return 'unhealthy-sensitive-groups';
  if (subscore >= 20) return 'unhealthy';
  return 'very-unhealthy';
}

function formatTrendTime(ts: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}

function trendChartData(points: TrendPoint[]): TrendChartPoint[] {
  return points.map(point => ({
    time: formatTrendTime(point.ts),
    value: point.value,
  }));
}

export function Dashboard() {
  const devices = useDevices();
  const homes = useHomes();
  const rooms = useRooms();
  const home = homes[0]; // For V1, we have one home
  const homeDevices = useMemo(
    () => (home ? devices.filter(device => device.homeId === home.id || device.homeId === null) : devices),
    [devices, home]
  );
  const homeRooms = useMemo(
    () => (home ? rooms.filter(room => room.homeId === home.id) : rooms),
    [rooms, home]
  );
  const [score, setScore] = useState<DailyScore | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendChartPoint[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!recordSuccess) return;
    const timer = window.setTimeout(() => setRecordSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [recordSuccess]);

  useEffect(() => {
    if (!home?.id) return;

    let alive = true;

    getAnalyticsScore(home.id, todayUtcDate())
      .then(result => {
        if (alive) setScore(result);
      })
      .catch(err => {
        console.error('Failed to load analytics score:', err);
        if (alive) setScore(null);
      });

    getAnalyticsTrends(home.id, 'day', 'pm25')
      .then(result => {
        if (alive) setTrendPoints(trendChartData(result.points));
      })
      .catch(err => {
        console.error('Failed to load PM2.5 trend:', err);
        if (alive) setTrendPoints([]);
      });

    return () => {
      alive = false;
    };
  }, [home?.id]);

  useEffect(() => {
    let alive = true;

    api.getAlerts()
      .then(data => {
        if (!alive) return;
        setAlertRules(data.rules as AlertRule[]);
        setAlertEvents(data.events as AlertEvent[]);
      })
      .catch(err => {
        console.error('Failed to load dashboard alerts:', err);
        if (!alive) return;
        setAlertRules([]);
        setAlertEvents([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const onlineCount = homeDevices.filter(device => device.status === 'online').length;
  const offlineCount = homeDevices.filter(device => device.status === 'offline').length;
  const openAlertCount = alertEvents.filter(event => event.status === 'open').length;
  const activeRuleCount = alertRules.filter(rule => rule.enabled).length;

  const avgAQI = useMemo(() => {
    const values = homeDevices
      .map(device => device.latestReading?.aqi)
      .filter((aqi): aqi is number => aqi !== null && aqi !== undefined);

    return values.length === 0 ? null : Math.round(average(values)!);
  }, [homeDevices]);

  const aqiBand = avgAQI === null ? null : getAQIBandInfo(avgAQI);
  const aqiBandClass = avgAQI === null ? 'good' : getAQIBand(avgAQI);

  const visibleMetrics = useMemo(
    () => METRIC_SUMMARIES
      .map(metric => ({ ...metric, value: averageMetric(homeDevices, metric.key) }))
      .filter(metric => !metric.optional || metric.value !== null),
    [homeDevices]
  );

  const scoreDrags = useMemo<ScoreBreakdown[]>(() => {
    if (!score?.breakdown.length) return [];
    return [...score.breakdown]
      .sort((left, right) => left.subscore - right.subscore)
      .slice(0, 3);
  }, [score]);

  const latestAlert = useMemo(() => {
    return [...alertEvents].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )[0];
  }, [alertEvents]);

  const handleExport = async (format: 'csv' | 'json', range: '24h' | '7d' | '30d') => {
    try {
      if (!home) {
        throw new Error('No home data available');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `${API_URL}/homes/${home.id}/export?format=${format}&range=${range}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `home-${home.id}-${range}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  return (
    <div className="dashboard">
      <GradientHeader
        title={getGreeting()}
        subtitle={`${home?.name || 'Dashboard'}${home ? ` · ${home.location.city}, ${home.location.region}` : ''}`}
        rightSlot={
          <>
            <ExportButton onExport={handleExport} label="Export Home Data" />
            <div className="dashboard-status-pill">
              <span className="dashboard-status-pill__dot" aria-hidden />
              {onlineCount} online · {offlineCount} offline
            </div>
          </>
        }
      >
        <div className="dashboard-header-stats">
          <div>
            <span>Rooms</span>
            <strong>{homeRooms.length}</strong>
          </div>
          <div>
            <span>Devices</span>
            <strong>{homeDevices.length}</strong>
          </div>
          <div>
            <span>Active alerts</span>
            <strong>{openAlertCount}</strong>
          </div>
        </div>
      </GradientHeader>

      <section className="dashboard-hero" aria-label="Today overview">
        <div className="dashboard-hero__actions">
          {recordSuccess && (
            <span className="dashboard-record-success" role="status">
              {recordSuccess}
            </span>
          )}
          <button
            type="button"
            className="record-pill"
            onClick={() => setRecordOpen(true)}
          >
            ✎ Record a reaction
          </button>
        </div>
        <div className="dashboard-hero__aqi">
          <div className="section-heading">
            <p>Current AQI</p>
            <h2>{aqiBand?.band || 'Awaiting readings'}</h2>
          </div>
          <AQIGauge
            aqi={avgAQI ?? 0}
            label={avgAQI === null ? 'No live AQI yet' : 'Home average'}
            size={260}
          />
          <p className={`dashboard-aqi-note dashboard-aqi-note--${aqiBandClass}`}>
            {avgAQI === null
              ? 'Sync a device to start building today’s air profile.'
              : `Today is tracking in the ${aqiBand?.band.toLowerCase()} band.`}
          </p>
        </div>

        <div className="dashboard-hero__score">
          <div className="section-heading">
            <p>Home score</p>
            <h2>{score?.band ? score.band : 'Today'}</h2>
          </div>
          <div className="score-panel">
            <ScoreRing score={score?.score ?? null} size={150} label="score" />
            <div className="score-panel__copy">
              <strong>{score?.hoursWithData ?? 0} hours with data</strong>
              <span>
                {score?.score === null || score === null
                  ? 'Score appears after the analytics service has enough readings.'
                  : 'Lower chips show the metrics pulling today’s score down.'}
              </span>
            </div>
          </div>
          <div className="score-breakdown" aria-label="Score breakdown">
            {scoreDrags.length === 0 && (
              <span className="score-breakdown__empty">No score breakdown yet</span>
            )}
            {scoreDrags.map(item => (
              <span
                key={item.metric}
                className={`score-breakdown__chip score-breakdown__chip--${scoreChipBand(item.subscore)}`}
              >
                {metricLabel(item.metric)} {Math.round(item.subscore)}
              </span>
            ))}
          </div>
        </div>

        <div className="dashboard-trend">
          <div className="section-heading">
            <p>Today</p>
            <h2>PM2.5 trend</h2>
          </div>
          <div className="trend-chart">
            {trendPoints.length === 0 ? (
              <div className="trend-chart__empty">No trend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={trendPoints} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary-bright)" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: 'var(--color-border)' }}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)} µg/m³`, 'PM2.5']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    fill="url(#dashboardTrendFill)"
                    connectNulls
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-metrics-title">
        <div className="section-heading">
          <p>Latest readings</p>
          <h2 id="dashboard-metrics-title">Room averages</h2>
        </div>
        <div className="dashboard-metrics">
          {visibleMetrics.map(metric => (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={formatMetricValue(metric.value, metric.precision)}
              unit={metric.unit}
              icon={metric.icon}
              status={metricStatus(metric.statusMetric, metric.value)}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section dashboard-alerts" aria-labelledby="dashboard-alerts-title">
        <div className="section-heading">
          <p>Alerts</p>
          <h2 id="dashboard-alerts-title">Threshold watch</h2>
        </div>
        <div className="alerts-summary">
          <div className="alerts-summary__stat">
            <span>Open</span>
            <strong>{openAlertCount}</strong>
          </div>
          <div className="alerts-summary__stat">
            <span>Active rules</span>
            <strong>{activeRuleCount}</strong>
          </div>
          <div className="alerts-summary__latest">
            <span>Latest event</span>
            <strong>{latestAlert ? metricLabel(latestAlert.metric) : 'All clear'}</strong>
            <small>
              {latestAlert
                ? `${latestAlert.status} · ${latestAlert.value}`
                : 'No alert events loaded for this home.'}
            </small>
          </div>
          <Link className="alerts-summary__link" to="/alerts">Manage alerts</Link>
        </div>
      </section>

      <section className="dashboard-section rooms-section" aria-labelledby="dashboard-devices-title">
        <div className="section-heading">
          <p>Devices</p>
          <h2 id="dashboard-devices-title">Rooms</h2>
        </div>
        <div className="rooms-grid">
          {homeDevices.map(device => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>

      {home && (
        <AnnotationDialog
          isOpen={recordOpen}
          onClose={() => setRecordOpen(false)}
          homeId={home.id}
          onSuccess={() => {
            setRecordSuccess('Reaction recorded.');
          }}
        />
      )}
    </div>
  );
}
