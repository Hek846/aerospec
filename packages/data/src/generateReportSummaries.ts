/**
 * Script to generate weekly report summaries
 * Run with: npx tsx scripts/generateReportSummaries.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SensorReading {
  deviceId: string;
  timestamp: string;
  pm25: number;
  pm10: number;
  co2: number;
  temperature: number;
  humidity: number;
  vocIndex: number;
  noiseDb: number;
  aqi: number;
}

interface Room {
  id: string;
  homeId: string;
  name: string;
  deviceId: string;
}

interface AlertEvent {
  metric: string;
}

interface RoomStats {
  roomId: string;
  avgAqi: number;
  maxAqi: number;
  maxAqiTimestamp: string;
}

interface MetricStats {
  metric: string;
  avgValue: number;
  maxValue: number;
  alertCount: number;
}

interface ReportSummaryStats {
  rooms: RoomStats[];
  metrics: MetricStats[];
  totalAlerts: number;
}

interface ReportSummary {
  id: string;
  homeId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summaryStats: ReportSummaryStats;
  worstRoomId?: string;
  link?: string;
}

// Load data
const readingsPath = join(__dirname, '..', 'src', 'data', 'sensorReadings.json');
const roomsPath = join(__dirname, '..', 'src', 'data', 'rooms.json');
const alertEventsPath = join(__dirname, '..', 'src', 'data', 'alertEvents.json');

const readings: SensorReading[] = JSON.parse(readFileSync(readingsPath, 'utf-8'));
const rooms: Room[] = JSON.parse(readFileSync(roomsPath, 'utf-8'));
const alertEvents: AlertEvent[] = JSON.parse(readFileSync(alertEventsPath, 'utf-8'));

console.log(`Loaded ${readings.length} readings`);
console.log(`Loaded ${rooms.length} rooms`);
console.log(`Loaded ${alertEvents.length} alert events`);

// Determine period (last 7 days of data)
const sortedReadings = [...readings].sort((a, b) =>
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
);

const periodStart = sortedReadings[0].timestamp;
const periodEnd = sortedReadings[sortedReadings.length - 1].timestamp;

console.log(`\nPeriod: ${periodStart} to ${periodEnd}`);

// Calculate room statistics
const roomStats: RoomStats[] = rooms.map(room => {
  const roomReadings = readings.filter(r => r.deviceId === room.deviceId);

  if (roomReadings.length === 0) {
    return {
      roomId: room.id,
      avgAqi: 0,
      maxAqi: 0,
      maxAqiTimestamp: periodStart,
    };
  }

  const avgAqi = roomReadings.reduce((sum, r) => sum + r.aqi, 0) / roomReadings.length;
  const maxReading = roomReadings.reduce((max, r) => r.aqi > max.aqi ? r : max);

  return {
    roomId: room.id,
    avgAqi: Math.round(avgAqi * 10) / 10,
    maxAqi: maxReading.aqi,
    maxAqiTimestamp: maxReading.timestamp,
  };
});

// Calculate metric statistics
const metricStats: MetricStats[] = [
  {
    metric: 'pm25',
    avgValue: Math.round((readings.reduce((sum, r) => sum + r.pm25, 0) / readings.length) * 10) / 10,
    maxValue: Math.max(...readings.map(r => r.pm25)),
    alertCount: alertEvents.filter(e => e.metric === 'pm25').length,
  },
  {
    metric: 'pm10',
    avgValue: Math.round((readings.reduce((sum, r) => sum + r.pm10, 0) / readings.length) * 10) / 10,
    maxValue: Math.max(...readings.map(r => r.pm10)),
    alertCount: 0,
  },
  {
    metric: 'co2',
    avgValue: Math.round(readings.reduce((sum, r) => sum + r.co2, 0) / readings.length),
    maxValue: Math.max(...readings.map(r => r.co2)),
    alertCount: alertEvents.filter(e => e.metric === 'co2').length,
  },
  {
    metric: 'temperature',
    avgValue: Math.round((readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length) * 10) / 10,
    maxValue: Math.round(Math.max(...readings.map(r => r.temperature)) * 10) / 10,
    alertCount: 0,
  },
  {
    metric: 'humidity',
    avgValue: Math.round((readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length) * 10) / 10,
    maxValue: Math.round(Math.max(...readings.map(r => r.humidity)) * 10) / 10,
    alertCount: 0,
  },
  {
    metric: 'vocIndex',
    avgValue: Math.round(readings.reduce((sum, r) => sum + r.vocIndex, 0) / readings.length),
    maxValue: Math.max(...readings.map(r => r.vocIndex)),
    alertCount: alertEvents.filter(e => e.metric === 'vocIndex').length,
  },
  {
    metric: 'noiseDb',
    avgValue: Math.round((readings.reduce((sum, r) => sum + r.noiseDb, 0) / readings.length) * 10) / 10,
    maxValue: Math.round(Math.max(...readings.map(r => r.noiseDb)) * 10) / 10,
    alertCount: 0,
  },
];

// Find worst room (highest average AQI)
const worstRoom = roomStats.reduce((worst, room) =>
  room.avgAqi > worst.avgAqi ? room : worst
);

// Create report summary
const reportSummary: ReportSummary = {
  id: 'report-001',
  homeId: 'home-lynnwood-1',
  periodStart,
  periodEnd,
  generatedAt: new Date().toISOString(),
  summaryStats: {
    rooms: roomStats,
    metrics: metricStats,
    totalAlerts: alertEvents.length,
  },
  worstRoomId: worstRoom.roomId,
  link: '/homes/home-lynnwood-1/reports/report-001',
};

console.log(`\nReport Summary:`);
console.log(`Total Alerts: ${reportSummary.summaryStats.totalAlerts}`);
console.log(`Worst Room: ${worstRoom.roomId} (avg AQI: ${worstRoom.avgAqi})`);
console.log(`\nRoom Stats:`);
roomStats.forEach(rs => {
  const room = rooms.find(r => r.id === rs.roomId);
  console.log(`  ${room?.name}: avg AQI ${rs.avgAqi}, max AQI ${rs.maxAqi}`);
});

// Write to file
const outputPath = join(__dirname, '..', 'src', 'data', 'reportSummaries.json');
writeFileSync(outputPath, JSON.stringify([reportSummary], null, 2));

console.log(`\nReport summary written to: ${outputPath}`);
console.log('Done!');
