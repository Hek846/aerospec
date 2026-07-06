import { Link } from 'react-router-dom';
import { Device } from '../types';
import { AQIBadge } from './AQIBadge';
import { useRoom } from '../hooks/useData';
import { formatDistanceToNow } from 'date-fns';
import './DeviceCard.css';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const latestReading = device.latestReading;
  const room = useRoom(device.roomId);

  const lastSeenDistance = device.lastSeen
    ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })
    : 'never seen';

  const getBatteryIcon = (level: number) => {
    if (level >= 75) return '🔋'; // Full
    if (level >= 50) return '🟨'; // Medium (yellow square)
    if (level >= 25) return '🟧'; // Low (orange square)
    return '🟥'; // Critical (red square)
  };

  return (
    <Link to={`/devices/${device.id}`} className="device-card-link">
      <div className={`device-card ${device.status === 'offline' ? 'device-card--offline' : ''}`}>
        <div className="device-card-header">
          <div className="device-info">
            <h3 className="device-name">{device.name}</h3>
            <p className="device-room">{room?.name || 'Unassigned'}</p>
          </div>
          <div className={`device-status device-status--${device.status}`}>
            <span className="status-indicator"></span>
            {device.status}
          </div>
        </div>

        {latestReading && latestReading.aqi !== null && (
          <div className="device-aqi">
            <AQIBadge aqi={latestReading.aqi} size="large" showBand={true} />
          </div>
        )}

        <div className="device-metrics">
          {latestReading && (
            <>
              <div className="metric-item">
                <span className="metric-item-label">PM2.5</span>
                <span className="metric-item-value">
                  {latestReading.pm25 !== null ? `${latestReading.pm25.toFixed(1)} µg/m³` : '—'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-item-label">Humidity</span>
                <span className="metric-item-value">
                  {latestReading.humidity !== null ? `${latestReading.humidity.toFixed(0)} %` : '—'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-item-label">Temp</span>
                <span className="metric-item-value">
                  {latestReading.temperature !== null ? `${latestReading.temperature.toFixed(1)}°C` : '—'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="device-footer">
          <div className="device-meta">
            {device.batteryLevel !== null && (
              <span title={`Battery: ${device.batteryLevel}%`}>
                {getBatteryIcon(device.batteryLevel)} {device.batteryLevel}%
              </span>
            )}
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
