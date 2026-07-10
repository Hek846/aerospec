import { useState, useMemo, useEffect } from 'react';
import { useRooms, useDevices } from '../hooks/useData';
import { api } from '../lib/api';
import { SensorReading } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import './CompareRooms.css';

type TimeRange = '24h' | '7d' | '30d';
type Metric = 'aqi' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'pressure';

interface ChartDataPoint {
  timestamp: string;
  displayTime: string;
  [key: string]: string | number | null;
}

const METRIC_CONFIG: Record<Metric, { label: string; unit: string }> = {
  aqi: { label: 'AQI', unit: '' },
  pm25: { label: 'PM2.5', unit: 'µg/m³' },
  pm10: { label: 'PM10', unit: 'µg/m³' },
  temperature: { label: 'Temperature', unit: '°C' },
  humidity: { label: 'Humidity', unit: '%' },
  pressure: { label: 'Pressure', unit: 'hPa' },
};

const ROOM_COLOR_VARS = [
  'var(--cr-color-1)',
  'var(--cr-color-2)',
  'var(--cr-color-3)',
  'var(--cr-color-4)',
  'var(--cr-color-5)',
  'var(--cr-color-6)',
  'var(--cr-color-7)',
  'var(--cr-color-8)',
  'var(--cr-color-9)',
  'var(--cr-color-10)',
];

export function CompareRooms() {
  const rooms = useRooms();
  const devices = useDevices();

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('aqi');
  const [readingsByDevice, setReadingsByDevice] = useState<Record<string, SensorReading[]>>({});

  // Toggle room selection
  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Fetch readings from the API for every selected room's device
  useEffect(() => {
    let alive = true;
    const deviceIds = selectedRoomIds
      .map(roomId => rooms.find(r => r.id === roomId)?.deviceId)
      .filter((id): id is string => !!id);

    Promise.all(
      deviceIds.map(deviceId =>
        api.getDeviceReadings(deviceId, timeRange)
          .then(r => [deviceId, r.readings as SensorReading[]] as const)
          .catch(() => [deviceId, [] as SensorReading[]] as const)
      )
    ).then(entries => {
      if (alive) setReadingsByDevice(Object.fromEntries(entries));
    });

    return () => {
      alive = false;
    };
  }, [selectedRoomIds, timeRange, rooms]);

  const getFilteredReadings = useMemo(
    () => Object.values(readingsByDevice).flat(),
    [readingsByDevice]
  );

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

      const values = roomReadings
        .map(r => r[selectedMetric])
        .filter((v): v is number => v !== null && v !== undefined);
      if (values.length === 0) return null;

      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const current = roomReadings[roomReadings.length - 1][selectedMetric] ?? values[values.length - 1];

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
                  style={{ backgroundColor: selectedRoomIds.includes(room.id) ? ROOM_COLOR_VARS[index % ROOM_COLOR_VARS.length] : undefined }}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="displayTime"
                      stroke="var(--color-text-tertiary)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="var(--color-text-tertiary)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                      itemStyle={{ color: 'var(--color-text-primary)' }}
                      labelStyle={{ color: 'var(--color-text-secondary)' }}
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
                          stroke={ROOM_COLOR_VARS[index % ROOM_COLOR_VARS.length]}
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
                              style={{ backgroundColor: ROOM_COLOR_VARS[index % ROOM_COLOR_VARS.length] }}
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
