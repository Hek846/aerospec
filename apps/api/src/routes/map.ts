import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';

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

// GET /map/cells?bbox=minLon,minLat,maxLon,maxLat&hours=24
// Privacy-fuzzed crowd data: readings aggregated to ~1.1 km grid cells
// (lat/lon rounded to 0.01°). Requires login but is not home-scoped.
router.get(
  '/cells',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const bbox = parseBbox(req.query.bbox);
    const hours = Math.min(
      24 * 30,
      Math.max(1, parseInt(String(req.query.hours ?? '24'), 10) || 24)
    );

    const result = await getPool().query<{
      lat: number;
      lon: number;
      device_count: string;
      avg_pm25: number | null;
      avg_aqi: number | null;
      last_ts: Date | null;
    }>(
      `SELECT ROUND(h.lat::numeric, 2)::double precision AS lat,
              ROUND(h.lon::numeric, 2)::double precision AS lon,
              count(DISTINCT d.id) AS device_count,
              avg(coalesce(sr.pm25_corr, sr.pm25_env))::real AS avg_pm25,
              avg(sr.aqi)::real AS avg_aqi,
              max(sr.ts) AS last_ts
         FROM sensor_readings sr
         JOIN devices d ON d.id = sr.device_id
         JOIN homes h ON h.id = d.home_id
        WHERE h.lat IS NOT NULL AND h.lon IS NOT NULL
          AND h.lon BETWEEN $1 AND $3
          AND h.lat BETWEEN $2 AND $4
          AND sr.ts >= now() - make_interval(hours => $5)
        GROUP BY 1, 2
        ORDER BY 1, 2`,
      [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, hours]
    );

    const cells = result.rows.map((row) => ({
      lat: row.lat,
      lon: row.lon,
      deviceCount: Number(row.device_count),
      avgPm25: row.avg_pm25 === null ? null : Math.round(row.avg_pm25 * 10) / 10,
      avgAqi: row.avg_aqi === null ? null : Math.round(row.avg_aqi),
      lastTs: row.last_ts ? row.last_ts.toISOString() : null
    }));

    res.json({ cells, total: cells.length, hours });
  })
);

export default router;
