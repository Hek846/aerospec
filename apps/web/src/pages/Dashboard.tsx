import { useMemo } from 'react';
import { useDevices, useHomes, useRooms, useSensorReadings } from '../hooks/useData';
import { DeviceCard } from '../components/DeviceCard';
import { ExportButton } from '../components/ExportButton';
import './Dashboard.css';

export function Dashboard() {
  const devices = useDevices();
  const homes = useHomes();
  const rooms = useRooms();
  const sensorReadings = useSensorReadings();
  const home = homes[0]; // For V1, we have one home

  // Get online/offline counts
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  // Compute the latest reading per device to avoid violating the Rules of Hooks
  const latestReadingsByDevice = useMemo(() => {
    const latest = new Map<string, typeof sensorReadings[number]>();

    for (const reading of sensorReadings) {
      const current = latest.get(reading.deviceId);
      if (!current || new Date(reading.timestamp) > new Date(current.timestamp)) {
        latest.set(reading.deviceId, reading);
      }
    }

    return latest;
  }, [sensorReadings]);

  // Get average AQI across all devices
  const latestReadings = Array.from(latestReadingsByDevice.values());
  const validReadings = latestReadings.filter(reading => reading.aqi !== undefined);
  const avgAQI = validReadings.length === 0
    ? 0
    : Math.round(validReadings.reduce((sum, reading) => sum + reading.aqi, 0) / validReadings.length);

  const handleExport = async (format: 'csv' | 'json', range: '24h' | '7d' | '30d') => {
    try {
      if (!home) {
        throw new Error('No home data available');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/homes/${home.id}/export?format=${format}&range=${range}`,
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
      a.download = `home-${home.id}-${range}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error; // Re-throw so ExportButton can handle it
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <p className="dashboard-kicker">Air quality control</p>
            <h1>{home?.name || 'Dashboard'}</h1>
            <p className="location">{home?.location.city}, {home?.location.region}</p>
          </div>
          <div className="header-actions">
            <ExportButton onExport={handleExport} label="Export Home Data" />
            <div className="header-pill">
              <span className="pill-dot" aria-hidden />
              Live telemetry synced
            </div>
          </div>
        </div>
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-label">Average AQI</div>
            <div className="stat-value stat-value--large">{avgAQI}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rooms</div>
            <div className="stat-value">{rooms.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Online</div>
            <div className="stat-value stat-value--success">{onlineCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Offline</div>
            <div className="stat-value stat-value--error">{offlineCount}</div>
          </div>
        </div>
      </header>

      <section className="rooms-section">
        <h2>Rooms</h2>
        <div className="rooms-grid">
          {devices.map(device => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>
    </div>
  );
}
