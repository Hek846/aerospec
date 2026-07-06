import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevice, useRoom, useDeviceSensorReadings, useLatestReading } from '../hooks/useData';
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
  const room = useRoom(device?.roomId || '');
  const readings = useDeviceSensorReadings(deviceId || '');
  const latestReading = useLatestReading(deviceId || '');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  if (!device) {
    return (
      <div className="device-detail-error">
        <h1>Device not found</h1>
        <Link to="/devices">← Back to devices</Link>
      </div>
    );
  }

  // Get readings based on selected time range
  const filteredReadings = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeRange) {
      case '24h':
        cutoff.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }

    return readings.filter(r => new Date(r.timestamp) >= cutoff);
  }, [readings, timeRange]);

  // Prepare chart data with anomaly detection
  const chartData = useMemo(() => {
    return filteredReadings.map(reading => ({
      timestamp: format(new Date(reading.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
      pm25: reading.pm25,
      pm10: reading.pm10,
      co2: reading.co2,
      temperature: reading.temperature,
      humidity: reading.humidity,
      vocIndex: reading.vocIndex,
      noiseDb: reading.noiseDb,
      aqi: reading.aqi,
      hasAnomaly: reading.anomalyFlags && reading.anomalyFlags.length > 0,
      anomalyFlags: reading.anomalyFlags,
    }));
  }, [filteredReadings, timeRange]);

  // Count anomalies
  const anomalyCount = useMemo(() => {
    return filteredReadings.filter(r => r.anomalyFlags && r.anomalyFlags.length > 0).length;
  }, [filteredReadings]);

  const handleExport = async (format: 'csv' | 'json', range: '24h' | '7d' | '30d') => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/devices/${deviceId}/export?format=${format}&range=${range}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-${deviceId}-${range}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error; // Re-throw so ExportButton can handle it
    }
  };

  const getMetricStatus = (metric: string, value: number): 'good' | 'warning' | 'alert' => {
    const thresholds: Record<string, { warning: number; alert: number }> = {
      pm25: { warning: 35, alert: 55 },
      co2: { warning: 1000, alert: 1500 },
      vocIndex: { warning: 200, alert: 300 },
      noiseDb: { warning: 50, alert: 70 },
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
          <section className="current-aqi">
            <h2>Current Air Quality</h2>
            <div className="aqi-display">
              <AQIBadge aqi={latestReading.aqi} size="large" showBand={true} />
            </div>
          </section>

          <section className="current-metrics">
            <h2>Current Readings</h2>
            <div className="metrics-grid">
              <MetricCard
                label="PM2.5"
                value={latestReading.pm25.toFixed(1)}
                unit="µg/m³"
                icon="💨"
                status={getMetricStatus('pm25', latestReading.pm25)}
              />
              <MetricCard
                label="PM10"
                value={latestReading.pm10.toFixed(1)}
                unit="µg/m³"
                icon="💨"
              />
              <MetricCard
                label="CO₂"
                value={latestReading.co2.toFixed(0)}
                unit="ppm"
                icon="🫁"
                status={getMetricStatus('co2', latestReading.co2)}
              />
              <MetricCard
                label="Temperature"
                value={latestReading.temperature.toFixed(1)}
                unit="°C"
                icon="🌡️"
              />
              <MetricCard
                label="Humidity"
                value={latestReading.humidity.toFixed(0)}
                unit="%"
                icon="💧"
              />
              <MetricCard
                label="VOC Index"
                value={latestReading.vocIndex.toFixed(0)}
                unit=""
                icon="🧪"
                status={getMetricStatus('vocIndex', latestReading.vocIndex)}
              />
              <MetricCard
                label="Noise"
                value={latestReading.noiseDb.toFixed(1)}
                unit="dB"
                icon="🔊"
                status={getMetricStatus('noiseDb', latestReading.noiseDb)}
              />
              <MetricCard
                label="Pressure"
                value={latestReading.pressure.toFixed(0)}
                unit="hPa"
                icon="🌐"
              />
            </div>
          </section>

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

            {anomalyCount > 0 && (
              <div className="anomaly-alert">
                ⚠️ {anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'} detected in this time range
              </div>
            )}

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
                    dot={(props: any) => {
                      if (props.payload.hasAnomaly) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={6}
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      }
                      return null;
                    }}
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
              <h3>CO₂ Levels</h3>
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
                    dataKey="co2"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={false}
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
          </section>
        </>
      )}

      <section className="device-info-section">
        <h2>Device Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Firmware Version</span>
            <span className="info-value">{device.firmwareVersion}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Battery Level</span>
            <span className="info-value">{device.batteryLevel}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">WiFi Signal</span>
            <span className="info-value">{device.wifiRssi} dBm</span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Seen</span>
            <span className="info-value">{format(new Date(device.lastSeen), 'PPpp')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Tags</span>
            <span className="info-value">
              {device.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
