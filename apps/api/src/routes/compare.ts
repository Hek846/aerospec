import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import {
  getRoomById,
  getDeviceById,
  getReadingsForDevice,
  getHomesForUser
} from '../data/loader.js';
import { AppError } from '../middleware/errorHandler.js';
import type { SensorReading, Room, Device } from '@aerospec/types';

const router: Router = express.Router();

// Type definitions for comparison data
interface MetricStats {
  avg: number;
  min: number;
  max: number;
  median: number;
  current: number | null;
}

interface RoomStats {
  pm25: MetricStats | null;
  pm10: MetricStats | null;
  co2: MetricStats | null;
  temperature: MetricStats | null;
  humidity: MetricStats | null;
  vocIndex: MetricStats | null;
  noiseDb: MetricStats | null;
  aqi: MetricStats | null;
}

interface RoomComparisonData {
  room: Room;
  device: Device | null;
  readings: SensorReading[];
  stats: RoomStats | null;
}

interface ComparisonSummaryItem {
  roomId: string;
  roomName: string;
  avgAqi?: number;
  currentAqi?: number;
  avgPm25?: number;
  maxPm25?: number;
  avgCo2?: number;
  maxCo2?: number;
}

interface ComparisonSummary {
  bestAirQuality: ComparisonSummaryItem;
  worstAirQuality: ComparisonSummaryItem;
  highestPm25: ComparisonSummaryItem;
  highestCo2: ComparisonSummaryItem;
  totalRoomsCompared: number;
}

// GET /compare?roomIds=id1,id2,id3&range=24h|7d|30d
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { roomIds, range = '24h' } = req.query;
  const userId = req.user!.userId;

  if (!roomIds || typeof roomIds !== 'string' || roomIds.trim() === '') {
    throw new AppError('roomIds query parameter is required and must be a non-empty string', 400);
  }

  // Validate range first
  const validRanges = ['24h', '7d', '30d'];
  if (typeof range !== 'string' || !validRanges.includes(range)) {
    throw new AppError(`Invalid range. Must be one of: ${validRanges.join(', ')}`, 400);
  }

  const roomIdList = roomIds.split(',').map(id => id.trim()).filter(id => id.length > 0);

  if (roomIdList.length < 2) {
    throw new AppError('At least 2 rooms are required for comparison', 400);
  }

  if (roomIdList.length > 10) {
    throw new AppError('Maximum 10 rooms can be compared at once', 400);
  }

  // Get user's accessible homes
  const userHomes = getHomesForUser(userId);
  const userHomeIds = new Set(userHomes.map(h => h.id));

  // Verify access and get room data
  const roomsData = roomIdList.map(roomId => {
    const room = getRoomById(roomId);
    if (!room) {
      throw new AppError(`Room ${roomId} not found`, 404);
    }

    // Verify user has access to this room's home
    if (!userHomeIds.has(room.homeId)) {
      throw new AppError(`Access denied to room ${roomId}`, 403);
    }

    const device = getDeviceById(room.deviceId);
    if (!device) {
      return {
        room,
        device: null,
        readings: [],
        stats: null
      };
    }

    // Get readings based on range
    const allReadings = getReadingsForDevice(device.id);
    const now = new Date();
    const cutoffTime = new Date(now);

    switch (range) {
      case '24h':
        cutoffTime.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoffTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffTime.setDate(now.getDate() - 30);
        break;
    }

    const filteredReadings = allReadings.filter(r =>
      new Date(r.timestamp) >= cutoffTime
    );

    // Calculate statistics
    const stats = calculateStats(filteredReadings);

    return {
      room,
      device,
      readings: filteredReadings,
      stats
    };
  });

  res.json({
    range,
    rooms: roomsData,
    comparisonSummary: generateComparisonSummary(roomsData)
  });
});

// Helper function to calculate statistics for a set of readings
function calculateStats(readings: SensorReading[]): RoomStats | null {
  if (readings.length === 0) {
    return null;
  }

  const metrics = ['pm25', 'pm10', 'co2', 'temperature', 'humidity', 'vocIndex', 'noiseDb', 'aqi'] as const;
  const stats: Partial<RoomStats> = {};

  metrics.forEach(metric => {
    const values = readings.map(r => r[metric]).filter(v => v !== null && v !== undefined);

    if (values.length === 0) {
      stats[metric] = null;
      return;
    }

    const sorted = [...values].sort((a, b) => a - b);
    stats[metric] = {
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      current: readings[0]?.[metric] ?? null
    };
  });

  return stats as RoomStats;
}

// Generate comparison summary across all rooms
function generateComparisonSummary(roomsData: RoomComparisonData[]): ComparisonSummary | null {
  const validRooms = roomsData.filter((r): r is RoomComparisonData & { stats: RoomStats } => r.stats !== null);

  if (validRooms.length === 0) {
    return null;
  }

  // Find best and worst rooms by AQI
  const aqiComparison = validRooms.map(r => ({
    roomId: r.room.id,
    roomName: r.room.name,
    avgAqi: r.stats.aqi.avg,
    currentAqi: r.stats.aqi.current
  })).sort((a, b) => a.avgAqi - b.avgAqi);

  // Find rooms with highest pollution
  const pm25Comparison = validRooms.map(r => ({
    roomId: r.room.id,
    roomName: r.room.name,
    avgPm25: r.stats.pm25.avg,
    maxPm25: r.stats.pm25.max
  })).sort((a, b) => b.avgPm25 - a.avgPm25);

  // Find rooms with highest CO2
  const co2Comparison = validRooms.map(r => ({
    roomId: r.room.id,
    roomName: r.room.name,
    avgCo2: r.stats.co2.avg,
    maxCo2: r.stats.co2.max
  })).sort((a, b) => b.avgCo2 - a.avgCo2);

  return {
    bestAirQuality: aqiComparison[0],
    worstAirQuality: aqiComparison[aqiComparison.length - 1],
    highestPm25: pm25Comparison[0],
    highestCo2: co2Comparison[0],
    totalRoomsCompared: validRooms.length
  };
}

export default router;
