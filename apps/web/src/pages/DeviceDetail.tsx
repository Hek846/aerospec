import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevice, useRoom, useDeviceReadings } from '../hooks/useData';
import { AQIBadge } from '../components/AQIBadge';
import { MetricCard } from '../components/MetricCard';
import { ExportButton } from '../components/ExportButton';
import { AnnotationDialog } from '../components/AnnotationDialog';
import { TAG_META } from '../components/AnnotationDialog';
import { getAnnotations } from '../api/annotations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, type TooltipProps } from 'recharts';
import { format, subHours, subDays } from 'date-fns';
import { getCompareContext, CompareContext } from '../api/compare';
import { getAQIBand } from '../utils/aqi';
import type { Annotation } from '@aerospec/types';
import './DeviceDetail.css';

type TimeRange = '24h' | '7d' | '30d';

interface CompareTileProps {
  title: string;
  subtitle: string;
  aqi: number | null;
  pm25: number | null;
  emptyText?: string;
  primary?: boolean;
}

function CompareTile({ title, subtitle, aqi, pm25, emptyText, primary }: CompareTileProps) {
  const band = aqi !== null ? getAQIBand(aqi) : undefined;
  const className = [
    'compare-card',
    primary ? 'compare-card--primary' : '',
    band ? `compare-card--band-${band}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="compare-card__header">
        <span className="compare-card__title">{title}</span>
        <span className="compare-card__subtitle">{subtitle}</span>
      </div>
      {aqi === null ? (
        <p className="compare-card__empty">{emptyText ?? 'No data available'}</p>
      ) : (
        <div className="compare-card__body">
          <AQIBadge aqi={aqi} size="large" showBand={true} />
          <div className="compare-card__metric">
            <span className="compare-card__metric-value">
              {pm25 !== null ? pm25.toFixed(1) : '—'}
            </span>
            <span className="compare-card__metric-label">Avg PM2.5 µg/m³</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const device = useDevice(deviceId || '');
  const room = useRoom(device?.roomId);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { readings, loading } = useDeviceReadings(deviceId, timeRange);
  const latestReading = device?.latestReading;

  const [compareContext, setCompareContext] = useState<CompareContext | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!recordSuccess) return;
    const timer = window.setTimeout(() => setRecordSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [recordSuccess]);

  useEffect(() => {
    if (!deviceId) return;
    let alive = true;
    setCompareLoading(true);
    getCompareContext(deviceId, 24)
      .then(data => {
        if (alive) {
          setCompareContext(data);
          setCompareLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load comparison context:', err);
        if (alive) setCompareLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!device?.homeId) return;
    let alive = true;

    const now = new Date();
    const from = timeRange === '24h'
      ? subHours(now, 24)
      : timeRange === '7d'
        ? subDays(now, 7)
        : subDays(now, 30);

    getAnnotations({
      homeId: device.homeId,
      from: from.toISOString(),
      to: now.toISOString(),
    })
      .then(data => {
        if (alive) setAnnotations(data.annotations);
      })
      .catch(err => {
        console.error('Failed to load annotations:', err);
        if (alive) setAnnotations([]);
      });

    return () => {
      alive = false;
    };
  }, [device?.homeId, timeRange]);

  // Snap each annotation to the nearest reading (by index): readings arrive
  // on a fixed interval while annotations have arbitrary timestamps, and the
  // chart's category axis can contain duplicate formatted labels, so neither
  // exact-time nor label-based matching works.
  const annotationsByIndex = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    if (readings.length === 0) return map;

    annotations.forEach(annotation => {
      const ts = new Date(annotation.ts).getTime();
      let bestIndex = 0;
      let bestDelta = Infinity;
      readings.forEach((reading, index) => {
        const delta = Math.abs(new Date(reading.timestamp).getTime() - ts);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = index;
        }
      });
      const list = map.get(bestIndex) ?? [];
      list.push(annotation);
      map.set(bestIndex, list);
    });
    return map;
  }, [annotations, readings]);

  const chartData = useMemo(() => {
    return readings.map((reading, index) => ({
      timestamp: format(new Date(reading.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
      pm25: reading.pm25,
      pm10: reading.pm10,
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      aqi: reading.aqi,
      // Non-null only where a reaction was recorded; rendered as a
      // dot-only series on the PM2.5 chart.
      annotationPm25: annotationsByIndex.has(index) ? reading.pm25 : null,
    }));
  }, [readings, timeRange, annotationsByIndex]);

  // Tooltip lookup by the hovered category label.
  const annotationMap = useMemo(() => {
    const map = new Map<string, Annotation[]>();
    annotationsByIndex.forEach((list, index) => {
      const point = chartData[index];
      if (!point) return;
      map.set(point.timestamp, [...(map.get(point.timestamp) ?? []), ...list]);
    });
    return map;
  }, [annotationsByIndex, chartData]);

  const AnnotationTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active) return null;
    const list = annotationMap.get(String(label));
    const allTags = list ? Array.from(new Set(list.flatMap(a => a.tags))) : [];

    return (
      <div className="annotation-tooltip">
        {payload?.filter(entry => entry.dataKey !== 'annotationPm25').map(entry => (
          <div key={String(entry.dataKey)} className="annotation-tooltip__row">
            <span
              className="annotation-tooltip__dot"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}: {entry.value !== undefined ? Number(entry.value).toFixed(1) : '—'}</span>
          </div>
        ))}
        {allTags.length > 0 && (
          <div className="annotation-tooltip__factors">
            <span className="annotation-tooltip__label">Factors</span>
            <div className="annotation-tooltip__tags">
              {allTags.map(tag => (
                <span key={tag} className="annotation-tooltip__tag">
                  {TAG_META[tag].emoji} {TAG_META[tag].label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!device) {
    return (
      <div className="device-detail-error">
        <h1>Device not found</h1>
        <Link to="/devices">← Back to devices</Link>
      </div>
    );
  }

  const handleExport = async (exportFormat: 'csv' | 'json', range: '24h' | '7d' | '30d') => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('authToken');

    const response = await fetch(
      `${API_URL}/devices/${deviceId}/export?format=${exportFormat}&range=${range}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-${deviceId}-${range}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getMetricStatus = (metric: string, value: number): 'good' | 'warning' | 'alert' => {
    const thresholds: Record<string, { warning: number; alert: number }> = {
      pm25: { warning: 35, alert: 55 },
      pm10: { warning: 150, alert: 250 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'good';

    if (value >= threshold.alert) return 'alert';
    if (value >= threshold.warning) return 'warning';
    return 'good';
  };

  return (
    <div className="device-detail">
      <div className="breadcrumb">
        <Link to="/devices">← Devices</Link>
      </div>

      <header className="device-header">
        <div className="device-title">
          <h1>{device.name}</h1>
          <div className="device-subtitle">
            <span className="room-name">{room?.name}</span>
            <span className="deployment-id">{device.deploymentId}</span>
          </div>
        </div>
        <div className="device-header-actions">
          {recordSuccess && (
            <span className="device-record-success" role="status">
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
          <ExportButton onExport={handleExport} label="Export Device Data" />
          <div className={`status-badge status-badge--${device.status}`}>
            {device.status}
          </div>
        </div>
      </header>

      {latestReading && (
        <>
          {latestReading.aqi !== null && (
            <section className="current-aqi">
              <h2>Current Air Quality</h2>
              <div className="aqi-display">
                <AQIBadge aqi={latestReading.aqi} size="large" showBand={true} />
              </div>
            </section>
          )}

          <section className="comparison-section">
            <h2>Compare Average AQI</h2>
            {compareLoading && !compareContext ? (
              <div className="comparison-loading">Loading comparison data…</div>
            ) : (
              <div className="comparison-grid">
                <CompareTile
                  title={compareContext?.device.name ?? device.name}
                  subtitle="Your device"
                  aqi={compareContext?.device.avgAqi ?? null}
                  pm25={compareContext?.device.avgPm25 ?? null}
                  primary
                />
                <CompareTile
                  title="Neighborhood"
                  subtitle={
                    compareContext?.neighborhood
                      ? `${compareContext.neighborhood.deviceCount} nearby devices`
                      : 'Neighborhood'
                  }
                  aqi={compareContext?.neighborhood?.avgAqi ?? null}
                  pm25={compareContext?.neighborhood?.avgPm25 ?? null}
                  emptyText="Not enough nearby data yet"
                />
                <CompareTile
                  title={compareContext?.city?.name ?? 'City'}
                  subtitle={
                    compareContext?.city
                      ? `${compareContext.city.stationCount} monitoring stations`
                      : 'Citywide average'
                  }
                  aqi={compareContext?.city?.avgAqi ?? null}
                  pm25={compareContext?.city?.avgPm25 ?? null}
                  emptyText="Not enough nearby data yet"
                />
              </div>
            )}
          </section>

          <section className="current-metrics">
            <h2>Current Readings</h2>
            <div className="metrics-grid">
              <MetricCard
                label="PM2.5"
                value={latestReading.pm25 !== null ? latestReading.pm25.toFixed(1) : '—'}
                unit="µg/m³"
                icon="💨"
                status={latestReading.pm25 !== null ? getMetricStatus('pm25', latestReading.pm25) : 'good'}
              />
              <MetricCard
                label="PM10"
                value={latestReading.pm10 !== null ? latestReading.pm10.toFixed(1) : '—'}
                unit="µg/m³"
                icon="💨"
                status={latestReading.pm10 !== null ? getMetricStatus('pm10', latestReading.pm10) : 'good'}
              />
              <MetricCard
                label="Temperature"
                value={latestReading.temperature !== null ? latestReading.temperature.toFixed(1) : '—'}
                unit="°C"
                icon="🌡️"
              />
              <MetricCard
                label="Humidity"
                value={latestReading.humidity !== null ? latestReading.humidity.toFixed(0) : '—'}
                unit="%"
                icon="💧"
              />
              <MetricCard
                label="Pressure"
                value={latestReading.pressure !== null ? latestReading.pressure.toFixed(0) : '—'}
                unit="hPa"
                icon="🌐"
              />
            </div>
          </section>
        </>
      )}

      <section className="charts-section">
        <div className="charts-header">
          <h2>Historical Data</h2>
          <div className="time-range-selector">
            <button
              className={`range-btn ${timeRange === '24h' ? 'active' : ''}`}
              onClick={() => setTimeRange('24h')}
            >
              24 Hours
            </button>
            <button
              className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button
              className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
          </div>
        </div>

        {loading && <div className="chart-loading">Loading readings…</div>}

        {!loading && chartData.length === 0 && (
          <div className="chart-loading">No readings in this time range yet. Sync the device from the mobile app.</div>
        )}

        {chartData.length > 0 && (
          <>
            <div className="chart-container">
              <h3>Air Quality Index</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <YAxis
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aqi"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Particulate Matter</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <YAxis
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <Tooltip content={<AnnotationTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pm25"
                    stroke="var(--color-error)"
                    strokeWidth={2}
                    dot={false}
                    name="PM2.5"
                  />
                  <Line
                    type="monotone"
                    dataKey="pm10"
                    stroke="var(--color-warning)"
                    strokeWidth={2}
                    dot={false}
                    name="PM10"
                  />
                  <Line
                    dataKey="annotationPm25"
                    stroke="none"
                    legendType="none"
                    isAnimationActive={false}
                    dot={{
                      r: 5,
                      fill: 'var(--color-primary-bright)',
                      stroke: 'var(--color-primary)',
                      strokeWidth: 2,
                    }}
                    name="Reaction"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Temperature & Humidity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <YAxis
                    stroke="var(--color-text-tertiary)"
                    tick={{ fill: 'var(--color-text-tertiary)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="var(--color-error)"
                    strokeWidth={2}
                    dot={false}
                    name="Temperature (°C)"
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="var(--color-info)"
                    strokeWidth={2}
                    dot={false}
                    name="Humidity (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="device-info-section">
        <h2>Device Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Serial</span>
            <span className="info-value">{device.deploymentId}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Firmware Version</span>
            <span className="info-value">{device.firmwareVersion || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Battery Level</span>
            <span className="info-value">{device.batteryLevel !== null ? `${device.batteryLevel}%` : '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Seen</span>
            <span className="info-value">
              {device.lastSeen ? format(new Date(device.lastSeen), 'PPpp') : 'never'}
            </span>
          </div>
        </div>
      </section>

      {device.homeId && (
        <AnnotationDialog
          isOpen={recordOpen}
          onClose={() => setRecordOpen(false)}
          homeId={device.homeId}
          deviceId={device.id}
          onSuccess={() => {
            setRecordSuccess('Reaction recorded.');
          }}
        />
      )}
    </div>
  );
}
