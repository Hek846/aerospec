import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './AdminDashboard.css';

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  devices: Array<{
    id: string;
    name: string;
    deploymentId: string;
    homeId: string;
    roomId: string;
    status: 'online' | 'offline';
    firmwareVersion: string;
    lastSeen: string;
    wifiRssi: number;
    batteryLevel: number;
  }>;
}

interface SystemStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  firmwareDistribution: Record<string, number>;
  averageBatteryLevel: number | null;
  averageWifiRssi: number | null;
}

export function AdminDashboard() {
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [otaLoading, setOtaLoading] = useState(false);
  const [otaMessage, setOtaMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devices, stats] = await Promise.all([
        api.getAdminDevices(),
        api.getAdminStats()
      ]);
      setDeviceStats(devices);
      setSystemStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    if (deviceStats) {
      if (selectedDevices.length === deviceStats.devices.length) {
        setSelectedDevices([]);
      } else {
        setSelectedDevices(deviceStats.devices.map(d => d.id));
      }
    }
  };

  const handleInitiateOTA = async () => {
    if (!firmwareVersion.trim()) {
      alert('Please enter a firmware version');
      return;
    }

    if (selectedDevices.length === 0) {
      alert('Please select at least one device');
      return;
    }

    try {
      setOtaLoading(true);
      setOtaMessage('');
      const result = await api.initiateOTA(firmwareVersion, selectedDevices);
      setOtaMessage(`OTA update initiated successfully! Job ID: ${result.job.id}`);
      setFirmwareVersion('');
      setSelectedDevices([]);
    } catch (err) {
      setOtaMessage(`Error: ${err instanceof Error ? err.message : 'Failed to initiate OTA'}`);
    } finally {
      setOtaLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  if (error) {
    return <div className="admin-error">Error: {error}</div>;
  }

  if (!deviceStats || !systemStats) {
    return <div className="admin-error">No data available</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>System-wide device management and monitoring</p>
      </header>

      <section className="stats-overview">
        <div className="stat-card">
          <h3>Total Devices</h3>
          <div className="stat-value">{systemStats.totalDevices}</div>
        </div>
        <div className="stat-card success">
          <h3>Online</h3>
          <div className="stat-value">{systemStats.onlineDevices}</div>
        </div>
        <div className="stat-card error">
          <h3>Offline</h3>
          <div className="stat-value">{systemStats.offlineDevices}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Battery</h3>
          <div className="stat-value">
            {systemStats.averageBatteryLevel != null ? `${systemStats.averageBatteryLevel.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <h3>Avg WiFi RSSI</h3>
          <div className="stat-value">
            {systemStats.averageWifiRssi != null ? `${systemStats.averageWifiRssi.toFixed(0)} dBm` : '—'}
          </div>
        </div>
      </section>

      <section className="firmware-section">
        <h2>Firmware Distribution</h2>
        <div className="firmware-list">
          {Object.entries(systemStats.firmwareDistribution).map(([version, count]) => (
            <div key={version} className="firmware-item">
              <span className="firmware-version">v{version}</span>
              <span className="firmware-count">{count} devices</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ota-section">
        <h2>OTA Update Management</h2>
        <div className="ota-form">
          <div className="form-group">
            <label htmlFor="firmware-version">Firmware Version:</label>
            <input
              type="text"
              id="firmware-version"
              value={firmwareVersion}
              onChange={(e) => setFirmwareVersion(e.target.value)}
              placeholder="e.g., 1.2.4"
              disabled={otaLoading}
            />
          </div>
          <div className="form-actions">
            <button
              onClick={handleInitiateOTA}
              disabled={otaLoading || selectedDevices.length === 0 || !firmwareVersion.trim()}
              className="ota-button"
            >
              {otaLoading ? 'Initiating...' : `Initiate OTA (${selectedDevices.length} devices)`}
            </button>
          </div>
          {otaMessage && (
            <div className={`ota-message ${otaMessage.startsWith('Error') ? 'error' : 'success'}`}>
              {otaMessage}
            </div>
          )}
        </div>
      </section>

      <section className="devices-section">
        <div className="devices-header">
          <h2>Fleet Management</h2>
          <button onClick={handleSelectAll} className="select-all-button">
            {selectedDevices.length === deviceStats.devices.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="devices-table-container">
          <table className="devices-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedDevices.length === deviceStats.devices.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Device Name</th>
                <th>Deployment ID</th>
                <th>Status</th>
                <th>Firmware</th>
                <th>Battery</th>
                <th>WiFi RSSI</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {deviceStats.devices.map(device => (
                <tr key={device.id} className={device.status}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceSelect(device.id)}
                    />
                  </td>
                  <td className="device-name">{device.name}</td>
                  <td className="deployment-id">{device.deploymentId}</td>
                  <td>
                    <span className={`status-badge ${device.status}`}>
                      {device.status}
                    </span>
                  </td>
                  <td>v{device.firmwareVersion}</td>
                  <td>
                    <div className="battery-indicator">
                      <div
                        className={`battery-fill ${
                          device.batteryLevel > 50 ? 'high' : device.batteryLevel > 20 ? 'mid' : 'low'
                        }`}
                        style={{ width: `${device.batteryLevel}%` }}
                      />
                      <span>{device.batteryLevel}%</span>
                    </div>
                  </td>
                  <td>{device.wifiRssi} dBm</td>
                  <td>{new Date(device.lastSeen).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
