import { useState, useEffect } from 'react';
import { api, downloadFile } from '../lib/api';
import { format } from 'date-fns';
import { AQIBadge } from '../components/AQIBadge';
import { ExportButton } from '../components/ExportButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './Reports.css';

interface ReportSummary {
  id: string;
  homeId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summaryStats: {
    rooms: Array<{
      roomId: string;
      avgAqi: number;
      maxAqi: number;
      maxAqiTimestamp: string;
    }>;
    metrics: Array<{
      metric: string;
      avgValue: number;
      maxValue: number;
      minValue: number;
    }>;
  };
}

export function Reports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getWeeklyReports();
      setReports(data.reports);
      if (data.reports.length > 0) {
        setSelectedReport(data.reports[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json') => {
    if (!selectedReport) return;
    const fileExt = format === 'csv' ? 'csv' : 'json';
    await downloadFile(
      `/reports/${selectedReport.id}/export?format=${format}`,
      `report-${selectedReport.id}.${fileExt}`
    );
  };

  if (loading) {
    return <div className="reports-loading">Loading reports...</div>;
  }

  if (error) {
    return <div className="reports-error">Error: {error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="reports-empty">
        <h1>Weekly Reports</h1>
        <p>No reports available yet. Reports are generated weekly.</p>
      </div>
    );
  }

  const rooms = selectedReport?.summaryStats.rooms ?? [];
  const metrics = selectedReport?.summaryStats.metrics ?? [];

  const roomChartData = rooms.map(room => ({
    roomId: room.roomId,
    avgAqi: room.avgAqi,
    maxAqi: room.maxAqi,
  }));

  const metricsChartData = metrics.map(metric => ({
    metric: metric.metric.toUpperCase(),
    avg: metric.avgValue,
    max: metric.maxValue,
    min: metric.minValue,
  }));

  const reportRange = selectedReport
    ? `${format(new Date(selectedReport.periodStart), 'MMM d')} – ${format(new Date(selectedReport.periodEnd), 'MMM d, yyyy')}`
    : '';

  const cleanestRoom = rooms.length
    ? rooms.reduce((best, room) => room.avgAqi < best.avgAqi ? room : best)
    : null;

  const spikiestRoom = rooms.length
    ? rooms.reduce((worst, room) => room.maxAqi > worst.maxAqi ? room : worst)
    : null;

  const steadyMetric = metrics.length
    ? metrics.reduce((steady, metric) => {
        const range = metric.maxValue - metric.minValue;
        const steadyRange = steady.maxValue - steady.minValue;
        return range < steadyRange ? metric : steady;
      })
    : null;

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <div>
          <p className="reports-kicker">Weekly digest</p>
          <h1>Reports</h1>
          <p className="reports-subtitle">Precision summaries, ready to hand off to ops or export for analysis.</p>
          {selectedReport && (
            <div className="reports-meta">
              <span className="meta-chip">{reportRange}</span>
              <span className="meta-chip subtle">
                Generated {format(new Date(selectedReport.generatedAt), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
        </div>
        {selectedReport && <ExportButton onExport={handleExportReport} label="Export report" />}
      </header>

      <div className="reports-layout">
        <aside className="reports-history">
          <div className="history-header">
            <h2>History</h2>
            <button className="history-refresh" onClick={loadReports}>Refresh</button>
          </div>
          <div className="history-list">
            {reports.map(report => (
              <button
                key={report.id}
                className={`history-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <span className="history-range">
                  {format(new Date(report.periodStart), 'MMM d')} – {format(new Date(report.periodEnd), 'MMM d, yyyy')}
                </span>
                <span className="history-stamp">
                  Generated {format(new Date(report.generatedAt), 'MMM d, h:mm a')}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="reports-content">
          {selectedReport && (
            <>
              <section className="report-summary">
                <div className="summary-grid">
                  <div className="summary-card">
                    <p className="summary-label">Rooms tracked</p>
                    <p className="summary-value">{rooms.length}</p>
                    <p className="summary-hint">Devices reporting this week</p>
                  </div>
                  {cleanestRoom && (
                    <div className="summary-card loft">
                      <p className="summary-label">Cleanest average</p>
                      <p className="summary-value">{cleanestRoom.roomId}</p>
                      <AQIBadge aqi={cleanestRoom.avgAqi} size="small" />
                      <p className="summary-hint">Avg AQI {cleanestRoom.avgAqi}</p>
                    </div>
                  )}
                  {spikiestRoom && (
                    <div className="summary-card loft">
                      <p className="summary-label">Highest spike</p>
                      <p className="summary-value">{spikiestRoom.roomId}</p>
                      <AQIBadge aqi={spikiestRoom.maxAqi} size="small" />
                      <p className="summary-hint">
                        Peak {spikiestRoom.maxAqi} at {format(new Date(spikiestRoom.maxAqiTimestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  )}
                  {steadyMetric && (
                    <div className="summary-card">
                      <p className="summary-label">Most stable metric</p>
                      <p className="summary-value">{steadyMetric.metric.toUpperCase()}</p>
                      <p className="summary-hint">
                        Range {steadyMetric.minValue.toFixed(1)} – {steadyMetric.maxValue.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="report-section">
                <div className="section-head">
                  <div>
                    <p className="section-kicker">Rooms</p>
                    <h3>Air quality overview</h3>
                  </div>
                </div>
                <div className="room-stats-grid">
                  {rooms.map(room => (
                    <div key={room.roomId} className="room-stat-card">
                      <div className="room-title">
                        <span className="room-dot" />
                        <h4>{room.roomId}</h4>
                      </div>
                      <div className="room-stat-content">
                        <div className="stat-item">
                          <span className="stat-label">Average AQI</span>
                          <AQIBadge aqi={room.avgAqi} size="small" />
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Peak AQI</span>
                          <AQIBadge aqi={room.maxAqi} size="small" />
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Peak time</span>
                          <span className="stat-value">
                            {format(new Date(room.maxAqiTimestamp), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="report-section">
                <div className="section-head">
                  <div>
                    <p className="section-kicker">Comparison</p>
                    <h3>Room AQI contrast</h3>
                  </div>
                </div>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={roomChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="roomId" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgAqi" fill="var(--report-bar-primary)" name="Average AQI" />
                      <Bar dataKey="maxAqi" fill="var(--report-bar-peak)" name="Peak AQI" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="report-section">
                <div className="section-head">
                  <div>
                    <p className="section-kicker">Metrics</p>
                    <h3>Environmental summary</h3>
                  </div>
                </div>
                <div className="metrics-summary">
                  {metrics.map(metric => (
                    <div key={metric.metric} className="metric-summary-card">
                      <h4>{metric.metric.toUpperCase()}</h4>
                      <div className="metric-stats">
                        <div className="metric-stat">
                          <span className="stat-label">Average</span>
                          <span className="stat-value">{metric.avgValue.toFixed(1)}</span>
                        </div>
                        <div className="metric-stat">
                          <span className="stat-label">Maximum</span>
                          <span className="stat-value">{metric.maxValue.toFixed(1)}</span>
                        </div>
                        <div className="metric-stat">
                          <span className="stat-label">Minimum</span>
                          <span className="stat-value">{metric.minValue.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="report-section">
                <div className="section-head">
                  <div>
                    <p className="section-kicker">Ranges</p>
                    <h3>Metrics range comparison</h3>
                  </div>
                </div>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metricsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="min" fill="var(--report-bar-min)" name="Minimum" />
                      <Bar dataKey="avg" fill="var(--report-bar-avg)" name="Average" />
                      <Bar dataKey="max" fill="var(--report-bar-max)" name="Maximum" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
