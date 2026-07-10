import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import { aggregateHomesToCells, resolutionForBbox } from '../lib/h3cells.js';

const router: Router = express.Router();

export interface Bbox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export function parseBbox(raw: unknown): Bbox {
  if (typeof raw !== 'string') {
    throw new AppError('bbox query parameter is required (minLon,minLat,maxLon,maxLat)', 400);
  }
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    throw new AppError('bbox must be four comma-separated numbers: minLon,minLat,maxLon,maxLat', 400);
  }
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (minLon > maxLon || minLat > maxLat) {
    throw new AppError('bbox is inverted: expected minLon,minLat,maxLon,maxLat', 400);
  }
  return { minLon, minLat, maxLon, maxLat };
}

// GET /map/cells?bbox=minLon,minLat,maxLon,maxLat&hours=24&res=8
// Privacy-fuzzed crowd data: homes are aggregated to H3 cells. Requires login
// but is not home-scoped.
router.get(
  '/cells',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const bbox = parseBbox(req.query.bbox);
    const hours = Math.min(
      24 * 30,
      Math.max(1, parseInt(String(req.query.hours ?? '24'), 10) || 24)
    );
    const requestedResolution =
      req.query.res === undefined ? undefined : parseInt(String(req.query.res), 10);
    const resolution = resolutionForBbox(bbox, requestedResolution);

    const result = await getPool().query<{
      id: string;
      lat: number;
      lon: number;
      device_count: string;
      avg_pm25: number | null;
      avg_aqi: number | null;
      last_ts: Date | null;
      reading_count: string;
    }>(
      `SELECT h.id,
              h.lat,
              h.lon,
              count(DISTINCT d.id) AS device_count,
              avg(coalesce(sr.pm25_corr, sr.pm25_env))::real AS avg_pm25,
              avg(sr.aqi)::real AS avg_aqi,
              max(sr.ts) AS last_ts,
              count(sr.*) AS reading_count
         FROM sensor_readings sr
         JOIN devices d ON d.id = sr.device_id
         JOIN homes h ON h.id = d.home_id
        WHERE h.lat IS NOT NULL AND h.lon IS NOT NULL
          AND h.lon BETWEEN $1 AND $3
          AND h.lat BETWEEN $2 AND $4
          AND sr.ts >= now() - make_interval(hours => $5)
        GROUP BY h.id, h.lat, h.lon
        ORDER BY h.id`,
      [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, hours]
    );

    const homes = result.rows.map((row) => ({
      id: row.id,
      lat: row.lat,
      lon: row.lon,
      deviceCount: Number(row.device_count),
      avgPm25: row.avg_pm25,
      avgAqi: row.avg_aqi,
      lastTs: row.last_ts,
      readingCount: Number(row.reading_count)
    }));
    const cells = aggregateHomesToCells(homes, resolution);

    res.json({ cells, total: cells.length, hours, resolution });
  })
);

export default router;
