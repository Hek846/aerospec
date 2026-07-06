import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevice, useRoom, useDeviceReadings } from '../hooks/useData';
import { AQIBadge } from '../components/AQIBadge';
import { MetricCard } from '../components/MetricCard';
import { ExportButton } from '../components/ExportButton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import './DeviceDetail.css';

type TimeRange = '24h' | '7d' | '30d';

export function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const device = useDevice(deviceId || '');
  const room = useRoom(device?.roomId);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { readings, loading } = useDeviceReadings(deviceId, timeRange);
  const latestReading = device?.latestReading;

  const chartData = useMemo(() => {
    return readings.map(reading => ({
      timestamp: format(new Date(reading.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
      pm25: reading.pm25,
      pm10: reading.pm10,
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      aqi: reading.aqi,
    }));
  }, [readings, timeRange]);

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
    </div>
  );
}
