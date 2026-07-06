import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  getRoomById,
  getDeviceRowById,
  getUserHomeIds,
  getReadingsForRange,
  parseRange,
  mapDevice,
  ApiReading,
  ApiDevice
} from '../db/queries.js';

const router: Router = express.Router();

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

interface ComparisonRoom {
  id: string;
  homeId: string;
  name: string;
  type: string;
  floor: string;
  deviceId: string;
}

interface RoomComparisonData {
  room: ComparisonRoom;
  device: ApiDevice | null;
  readings: ApiReading[];
  stats: RoomStats | null;
}

interface ComparisonSummaryItem {
  roomId: string;
  roomName: string;
  avgAqi?: number;
  currentAqi?: number | null;
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
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { roomIds } = req.query;
    const rawRange = req.query.range ?? '24h';

    if (!roomIds || typeof roomIds !== 'string' || roomIds.trim() === '') {
      throw new AppError('roomIds query parameter is required and must be a non-empty string', 400);
    }

    const validRanges = ['24h', '7d', '30d'];
    if (typeof rawRange !== 'string' || !validRanges.includes(rawRange)) {
      throw new AppError(`Invalid range. Must be one of: ${validRanges.join(', ')}`, 400);
    }
    const range = parseRange(rawRange);

    const roomIdList = roomIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (roomIdList.length < 2) {
      throw new AppError('At least 2 rooms are required for comparison', 400);
    }
    if (roomIdList.length > 10) {
      throw new AppError('Maximum 10 rooms can be compared at once', 400);
    }

    const isAdmin = req.user!.role === 'admin';
    const userHomeIds = new Set(isAdmin ? [] : await getUserHomeIds(req.user!.userId));

    const roomsData: RoomComparisonData[] = [];
    for (const roomId of roomIdList) {
      const room = await getRoomById(roomId);
      if (!room) {
        throw new AppError(`Room ${roomId} not found`, 404);
      }
      if (!isAdmin && !userHomeIds.has(room.homeId)) {
        throw new AppError(`Access denied to room ${roomId}`, 403);
      }

      const deviceRow = room.deviceId ? await getDeviceRowById(room.deviceId) : null;
      if (!deviceRow) {
        roomsData.push({ room, device: null, readings: [], stats: null });
        continue;
      }

      const readings = await getReadingsForRange(deviceRow.id, range);
      roomsData.push({
        room,
        device: mapDevice(deviceRow),
        readings,
        stats: calculateStats(readings)
      });
    }

    res.json({
      range,
      rooms: roomsData,
      comparisonSummary: generateComparisonSummary(roomsData)
    });
  })
);

const METRICS = [
  'pm25',
  'pm10',
  'co2',
  'temperature',
  'humidity',
  'vocIndex',
  'noiseDb',
  'aqi'
] as const;

function calculateStats(readings: ApiReading[]): RoomStats | null {
  if (readings.length === 0) {
    return null;
  }

  const latest = readings[readings.length - 1];
  const stats: Partial<RoomStats> = {};

  for (const metric of METRICS) {
    const values = readings
      .map((r) => r[metric])
      .filter((v): v is number => v !== null && v !== undefined);

    if (values.length === 0) {
      stats[metric] = null;
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    stats[metric] = {
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
      median: sorted[Math.floor(sorted.length / 2)]!,
      current: latest?.[metric] ?? null
    };
  }

  return stats as RoomStats;
}

function generateComparisonSummary(roomsData: RoomComparisonData[]): ComparisonSummary | null {
  const validRooms = roomsData.filter(
    (r): r is RoomComparisonData & { stats: RoomStats } => r.stats !== null
  );

  if (validRooms.length === 0) {
    return null;
  }

  const aqiComparison = validRooms
    .map((r) => ({
      roomId: r.room.id,
      roomName: r.room.name,
      avgAqi: r.stats.aqi?.avg ?? 0,
      currentAqi: r.stats.aqi?.current ?? null
    }))
    .sort((a, b) => a.avgAqi - b.avgAqi);

  const pm25Comparison = validRooms
    .map((r) => ({
      roomId: r.room.id,
      roomName: r.room.name,
      avgPm25: r.stats.pm25?.avg ?? 0,
      maxPm25: r.stats.pm25?.max ?? 0
    }))
    .sort((a, b) => b.avgPm25 - a.avgPm25);

  const co2Comparison = validRooms
    .map((r) => ({
      roomId: r.room.id,
      roomName: r.room.name,
      avgCo2: r.stats.co2?.avg ?? 0,
      maxCo2: r.stats.co2?.max ?? 0
    }))
    .sort((a, b) => b.avgCo2 - a.avgCo2);

  return {
    bestAirQuality: aqiComparison[0]!,
    worstAirQuality: aqiComparison[aqiComparison.length - 1]!,
    highestPm25: pm25Comparison[0]!,
    highestCo2: co2Comparison[0]!,
    totalRoomsCompared: validRooms.length
  };
}

export default router;
