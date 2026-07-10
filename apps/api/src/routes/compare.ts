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
  isUuid,
  ApiReading,
  ApiDevice
} from '../db/queries.js';
import { getPool } from '../db/pool.js';
import { pm25ToAqi } from '../lib/aqi.js';
import { latLngToCell, cellToBoundary } from 'h3-js';
import { aggregateHomesToCells, type HomeAggregate } from '../lib/h3cells.js';
import { fetchOpenAqStationsForBbox, type Station } from './external.js';
import { type Bbox } from './map.js';

const router: Router = express.Router();

const NEIGHBORHOOD_H3_RES = 7;
const CITY_RADIUS_KM = 25;

export function clampHours(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 24;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(168, Math.max(1, Math.trunc(parsed)));
}

export function formatPm25(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
}

export function averagePm25(values: number[]): number | null {
  const valid = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return formatPm25(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

export function bboxFromBoundary(boundary: Array<[number, number]>): Bbox {
  const lats = boundary.map(([lat]) => lat);
  const lons = boundary.map(([, lon]) => lon);
  return {
    minLon: Math.min(...lons),
    minLat: Math.min(...lats),
    maxLon: Math.max(...lons),
    maxLat: Math.max(...lats)
  };
}

/** Rough km-to-degree conversion for a bounding box around a point. */
export function bboxAroundPoint(lat: number, lon: number, radiusKm: number): Bbox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLon: Math.max(-180, lon - lonDelta),
    minLat: Math.max(-90, lat - latDelta),
    maxLon: Math.min(180, lon + lonDelta),
    maxLat: Math.min(90, lat + latDelta)
  };
}

function squaredDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  // 12742 km is the mean Earth diameter; squared avoids the sqrt.
  return 12742 ** 2 * (a < 0 ? 0 : a);
}

export function nearestStationName(
  stations: Pick<Station, 'name' | 'lat' | 'lon'>[],
  lat: number,
  lon: number
): string | null {
  if (stations.length === 0) return null;
  let nearest = stations[0]!;
  let nearestDist = squaredDistanceKm(lat, lon, nearest.lat, nearest.lon);
  for (const station of stations.slice(1)) {
    const d = squaredDistanceKm(lat, lon, station.lat, station.lon);
    if (d < nearestDist) {
      nearest = station;
      nearestDist = d;
    }
  }
  return nearest.name ?? null;
}

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

interface ContextReadingStats {
  avgPm25: number | null;
  avgAqi: number | null;
}

interface ContextDevice extends ContextReadingStats {
  id: string;
  name: string;
}

interface ContextNeighborhood extends ContextReadingStats {
  h3: string;
  resolution: number;
  deviceCount: number;
}

interface ContextCity extends ContextReadingStats {
  name: string;
  stationCount: number;
  source: 'openaq';
}

// GET /compare/context?deviceId=<uuid>&hours=24
router.get(
  '/context',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const rawDeviceId = req.query.deviceId;
    if (typeof rawDeviceId !== 'string' || !isUuid(rawDeviceId)) {
      throw new AppError('deviceId query parameter is required and must be a valid UUID', 400);
    }
    const deviceId = rawDeviceId;
    const hours = clampHours(req.query.hours);

    const deviceRow = await getDeviceRowById(deviceId);
    if (!deviceRow) {
      throw new AppError(`Device ${deviceId} not found`, 404);
    }

    const homeId = deviceRow.home_id;
    if (!homeId) {
      throw new AppError(`Access denied to device ${deviceId}`, 403);
    }

    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin) {
      const userHomeIds = new Set(await getUserHomeIds(req.user!.userId));
      if (!userHomeIds.has(homeId)) {
        throw new AppError(`Access denied to device ${deviceId}`, 403);
      }
    }

    const homeResult = await getPool().query<{ lat: number | null; lon: number | null; city: string | null }>(
      'SELECT lat, lon, city FROM homes WHERE id = $1',
      [homeId]
    );
    const home = homeResult.rows[0];
    if (!home) {
      throw new AppError(`Home for device ${deviceId} not found`, 404);
    }

    const deviceAgg = await getPool().query<{ avg_pm25: number | null }>(
      `SELECT avg(coalesce(sr.pm25_corr, sr.pm25_env))::real AS avg_pm25
         FROM sensor_readings sr
        WHERE sr.device_id = $1 AND sr.ts >= now() - make_interval(hours => $2)`,
      [deviceId, hours]
    );
    const deviceAvgPm25 = formatPm25(deviceAgg.rows[0]?.avg_pm25);
    const deviceAvgAqi = deviceAvgPm25 !== null ? pm25ToAqi(deviceAvgPm25) : null;

    const device: ContextDevice = {
      id: deviceRow.id,
      name: deviceRow.name,
      avgPm25: deviceAvgPm25,
      avgAqi: deviceAvgAqi
    };

    let neighborhood: ContextNeighborhood | null = null;
    if (home.lat !== null && home.lon !== null) {
      const targetCell = latLngToCell(home.lat, home.lon, NEIGHBORHOOD_H3_RES);
      const boundary = cellToBoundary(targetCell) as Array<[number, number]>;
      const bbox = bboxFromBoundary(boundary);

      const homesAgg = await getPool().query<{
        id: string;
        lat: number;
        lon: number;
        device_count: string;
        avg_pm25: number | null;
        avg_aqi: number | null;
        reading_count: string;
      }>(
        `SELECT h.id,
                h.lat,
                h.lon,
                count(DISTINCT d.id) AS device_count,
                avg(coalesce(sr.pm25_corr, sr.pm25_env))::real AS avg_pm25,
                avg(sr.aqi)::real AS avg_aqi,
                count(sr.*) AS reading_count
           FROM sensor_readings sr
           JOIN devices d ON d.id = sr.device_id
           JOIN homes h ON h.id = d.home_id
          WHERE h.lat IS NOT NULL AND h.lon IS NOT NULL
            AND h.lon BETWEEN $1 AND $3
            AND h.lat BETWEEN $2 AND $4
            AND sr.ts >= now() - make_interval(hours => $5)
          GROUP BY h.id, h.lat, h.lon`,
        [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, hours]
      );

      const homeAggregates: HomeAggregate[] = homesAgg.rows.map((row) => ({
        id: row.id,
        lat: row.lat,
        lon: row.lon,
        deviceCount: Number(row.device_count),
        avgPm25: row.avg_pm25,
        avgAqi: row.avg_aqi,
        lastTs: null,
        readingCount: Number(row.reading_count)
      }));

      const cells = aggregateHomesToCells(homeAggregates, NEIGHBORHOOD_H3_RES);
      const target = cells.find((c) => c.h3 === targetCell);
      if (target) {
        neighborhood = {
          h3: target.h3,
          resolution: target.resolution,
          deviceCount: target.deviceCount,
          avgPm25: target.avgPm25,
          avgAqi: target.avgAqi
        };
      }
    }

    let city: ContextCity | null = null;
    if (home.lat !== null && home.lon !== null && process.env.OPENAQ_API_KEY) {
      try {
        const bbox = bboxAroundPoint(home.lat, home.lon, CITY_RADIUS_KM);
        const { stations } = await fetchOpenAqStationsForBbox(bbox);
        const withPm25 = stations.filter((s): s is Station & { pm25: number } => typeof s.pm25 === 'number');
        if (withPm25.length > 0) {
          const avgPm25 = averagePm25(withPm25.map((s) => s.pm25));
          const name = home.city || nearestStationName(withPm25, home.lat, home.lon) || 'Unknown';
          city = {
            name,
            stationCount: withPm25.length,
            avgPm25,
            avgAqi: avgPm25 !== null ? pm25ToAqi(avgPm25) : null,
            source: 'openaq'
          };
        }
      } catch {
        // OpenAQ is best-effort for this endpoint; leave city null on failure.
      }
    }

    res.json({ device, neighborhood, city, hours });
  })
);

export default router;
