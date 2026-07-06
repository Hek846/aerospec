import { Link } from 'react-router-dom';
import { Device } from '../types';
import { AQIBadge } from './AQIBadge';
import { useLatestReading, useRoom } from '../hooks/useData';
import { formatDistanceToNow } from 'date-fns';
import './DeviceCard.css';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const latestReading = useLatestReading(device.id);
  const room = useRoom(device.roomId);

  const lastSeenDistance = formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true });

  const getBatteryIcon = (level: number) => {
    if (level >= 75) return '🔋'; // Full
    if (level >= 50) return '🟨'; // Medium (yellow square)
    if (level >= 25) return '🟧'; // Low (orange square)
    return '🟥'; // Critical (red square)
  };

  const getSignalIcon = (rssi: number) => {
    if (rssi >= -50) return '📶'; // strong signal
    if (rssi >= -70) return '📳'; // medium signal
    return '📡'; // weak signal
  };

  return (
    <Link to={`/devices/${device.id}`} className="device-card-link">
      <div className={`device-card ${device.status === 'offline' ? 'device-card--offline' : ''}`}>
        <div className="device-card-header">
          <div className="device-info">
            <h3 className="device-name">{device.name}</h3>
            <p className="device-room">{room?.name || 'Unknown Room'}</p>
          </div>
          <div className={`device-status device-status--${device.status}`}>
            <span className="status-indicator"></span>
            {device.status}
          </div>
        </div>

        {latestReading && (
          <div className="device-aqi">
            <AQIBadge aqi={latestReading.aqi} size="large" showBand={true} />
          </div>
        )}

        <div className="device-metrics">
          {latestReading && (
            <>
              <div className="metric-item">
                <span className="metric-item-label">PM2.5</span>
                <span className="metric-item-value">{latestReading.pm25.toFixed(1)} µg/m³</span>
              </div>
              <div className="metric-item">
                <span className="metric-item-label">CO₂</span>
                <span className="metric-item-value">{latestReading.co2.toFixed(0)} ppm</span>
              </div>
              <div className="metric-item">
                <span className="metric-item-label">Temp</span>
                <span className="metric-item-value">{latestReading.temperature.toFixed(1)}°C</span>
              </div>
            </>
          )}
        </div>

        <div className="device-footer">
          <div className="device-meta">
            <span title={`Battery: ${device.batteryLevel}%`}>
              {getBatteryIcon(device.batteryLevel)} {device.batteryLevel}%
            </span>
            <span title={`WiFi Signal: ${device.wifiRssi} dBm`}>
              {getSignalIcon(device.wifiRssi)}
            </span>
            <span className="device-id">{device.deploymentId}</span>
          </div>
          <div className="device-last-seen">
            {lastSeenDistance}
          </div>
        </div>
      </div>
    </Link>
  );
}
