import { useState, useMemo } from 'react';
import { useRooms, useDevices, useSensorReadings } from '../hooks/useData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import './CompareRooms.css';

type TimeRange = '24h' | '7d' | '30d';
type Metric = 'aqi' | 'pm25' | 'pm10' | 'co2' | 'temperature' | 'humidity' | 'vocIndex' | 'noiseDb';

interface ChartDataPoint {
  timestamp: string;
  displayTime: string;
  [key: string]: string | number;
}

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string }> = {
  aqi: { label: 'AQI', unit: '', color: '#6366f1' },
  pm25: { label: 'PM2.5', unit: 'µg/m³', color: '#ec4899' },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#f97316' },
  co2: { label: 'CO₂', unit: 'ppm', color: '#14b8a6' },
  temperature: { label: 'Temperature', unit: '°C', color: '#ef4444' },
  humidity: { label: 'Humidity', unit: '%', color: '#3b82f6' },
  vocIndex: { label: 'VOC Index', unit: '', color: '#8b5cf6' },
  noiseDb: { label: 'Noise', unit: 'dB', color: '#f59e0b' },
};

const ROOM_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#06b6d4'
];

export function CompareRooms() {
  const rooms = useRooms();
  const devices = useDevices();
  const allReadings = useSensorReadings();

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('aqi');

  // Toggle room selection
  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Get filtered readings based on time range
  const getFilteredReadings = useMemo(() => {
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

    return allReadings.filter(r => new Date(r.timestamp) >= cutoff);
  }, [allReadings, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (selectedRoomIds.length === 0) return [];

    // Get device IDs for selected rooms
    const selectedDeviceIds = new Set(
      selectedRoomIds
        .map(roomId => {
          const room = rooms.find(r => r.id === roomId);
          return room?.deviceId;
        })
        .filter((deviceId): deviceId is string => deviceId !== undefined && deviceId !== null)
    );

    // Group readings by timestamp
    const readingsByTimestamp = new Map<string, ChartDataPoint>();

    getFilteredReadings.forEach(reading => {
      if (!selectedDeviceIds.has(reading.deviceId)) return;

      const room = rooms.find(r => r.deviceId === reading.deviceId);
      if (!room) return;

      const timestampKey = new Date(reading.timestamp).toISOString();

      if (!readingsByTimestamp.has(timestampKey)) {
        readingsByTimestamp.set(timestampKey, {
          timestamp: reading.timestamp,
          displayTime: format(new Date(reading.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
        });
      }

      const data = readingsByTimestamp.get(timestampKey)!;
      data[`${room.name}_${selectedMetric}`] = reading[selectedMetric];
    });

    return Array.from(readingsByTimestamp.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedRoomIds, getFilteredReadings, selectedMetric, timeRange, rooms]);

  // Calculate statistics for each selected room
  const roomStats = useMemo(() => {
    return selectedRoomIds.map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return null;

      const device = devices.find(d => d.id === room.deviceId);
      if (!device) return null;

      const roomReadings = getFilteredReadings.filter(r => r.deviceId === device.id);
      if (roomReadings.length === 0) return null;

      const values = roomReadings.map(r => r[selectedMetric]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return null;

      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const current = roomReadings[roomReadings.length - 1][selectedMetric];

      return {
        room,
        device,
        stats: { avg, min, max, current },
      };
    }).filter(Boolean);
  }, [selectedRoomIds, rooms, devices, getFilteredReadings, selectedMetric]);

  return (
    <div className="compare-rooms">
      <header className="compare-header">
        <h1>Compare Rooms</h1>
        <p className="compare-subtitle">Analyze air quality metrics across multiple rooms</p>
      </header>

      <section className="compare-controls">
        <div className="control-group">
          <h3>Select Rooms</h3>
          <div className="room-checkboxes">
            {rooms.map((room, index) => (
              <label key={room.id} className="room-checkbox">
                <input
                  type="checkbox"
                  checked={selectedRoomIds.includes(room.id)}
                  onChange={() => toggleRoom(room.id)}
                />
                <span
                  className="checkbox-indicator"
                  style={{ backgroundColor: selectedRoomIds.includes(room.id) ? ROOM_COLORS[index % ROOM_COLORS.length] : undefined }}
                />
                <span className="room-name">{room.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h3>Time Range</h3>
          <div className="time-range-buttons">
            {(['24h', '7d', '30d'] as TimeRange[]).map(range => (
              <button
                key={range}
                className={`range-button ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h3>Metric</h3>
          <select
            className="metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as Metric)}
          >
            {Object.entries(METRIC_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} {config.unit && `(${config.unit})`}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedRoomIds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No rooms selected</h2>
          <p>Select at least 2 rooms to start comparing air quality data</p>
        </div>
      ) : selectedRoomIds.length === 1 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>Select more rooms</h2>
          <p>Select at least 2 rooms to compare data</p>
        </div>
      ) : (
        <>
          <section className="compare-chart-section">
            <h2>
              {METRIC_CONFIG[selectedMetric].label} Comparison
              {METRIC_CONFIG[selectedMetric].unit && ` (${METRIC_CONFIG[selectedMetric].unit})`}
            </h2>
            <div className="chart-container">
              {chartData.length === 0 ? (
                <div className="chart-empty">No data available for this time range</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="displayTime"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    {selectedRoomIds.map((roomId, index) => {
                      const room = rooms.find(r => r.id === roomId);
                      if (!room) return null;

                      return (
                        <Line
                          key={roomId}
                          type="monotone"
                          dataKey={`${room.name}_${selectedMetric}`}
                          stroke={ROOM_COLORS[index % ROOM_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          name={room.name}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="compare-stats-section">
            <h2>Statistics Summary</h2>
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Current</th>
                    <th>Average</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  {roomStats.map((stat, index) => {
                    if (!stat) return null;

                    const unit = METRIC_CONFIG[selectedMetric].unit;
                    const formatValue = (val: number) => `${val.toFixed(1)}${unit ? ' ' + unit : ''}`;

                    return (
                      <tr key={stat.room.id}>
                        <td>
                          <div className="room-cell">
                            <span
                              className="room-indicator"
                              style={{ backgroundColor: ROOM_COLORS[index % ROOM_COLORS.length] }}
                            />
                            {stat.room.name}
                          </div>
                        </td>
                        <td className="stat-value">{formatValue(stat.stats.current)}</td>
                        <td className="stat-value">{formatValue(stat.stats.avg)}</td>
                        <td className="stat-value stat-min">{formatValue(stat.stats.min)}</td>
                        <td className="stat-value stat-max">{formatValue(stat.stats.max)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
