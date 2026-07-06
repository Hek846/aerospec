import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { pm25ToAqi } from '../lib/aqi.js';
import { parseBbox } from './map.js';

const router: Router = express.Router();

const OPENAQ_BASE = 'https://api.openaq.org/v3/locations';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface Station {
  id: number | string;
  name: string;
  lat: number;
  lon: number;
  pm25: number | null;
  aqi: number | null;
  lastUpdated: string | null;
}

interface CacheEntry {
  expires: number;
  stations: Station[];
}

const cache = new Map<string, CacheEntry>();

// Loosely typed view of the OpenAQ v3 locations payload — only the fields we read.
interface OpenAQLocation {
  id?: number | string;
  name?: string;
  coordinates?: { latitude?: number; longitude?: number };
  datetimeLast?: { utc?: string } | string | null;
  sensors?: Array<{
    parameter?: { name?: string };
    latest?: { value?: number; datetime?: { utc?: string } } | null;
  }>;
}

function normalizeLocation(loc: OpenAQLocation): Station | null {
  const lat = loc.coordinates?.latitude;
  const lon = loc.coordinates?.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const pm25Sensor = loc.sensors?.find((s) => s.parameter?.name === 'pm25');
  const pm25 =
    typeof pm25Sensor?.latest?.value === 'number' ? pm25Sensor.latest.value : null;

  let lastUpdated: string | null = null;
  if (typeof loc.datetimeLast === 'string') {
    lastUpdated = loc.datetimeLast;
  } else if (loc.datetimeLast && typeof loc.datetimeLast.utc === 'string') {
    lastUpdated = loc.datetimeLast.utc;
  } else if (pm25Sensor?.latest?.datetime?.utc) {
    lastUpdated = pm25Sensor.latest.datetime.utc;
  }

  return {
    id: loc.id ?? '',
    name: loc.name ?? 'Unknown station',
    lat,
    lon,
    pm25,
    aqi: pm25ToAqi(pm25),
    lastUpdated
  };
}

// GET /external/openaq/latest?bbox=minLon,minLat,maxLon,maxLat
router.get(
  '/openaq/latest',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const bbox = parseBbox(req.query.bbox);
    const bboxKey = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;

    const cached = cache.get(bboxKey);
    if (cached && cached.expires > Date.now()) {
      res.json({ stations: cached.stations, total: cached.stations.length, cached: true });
      return;
    }

    const url = `${OPENAQ_BASE}?bbox=${encodeURIComponent(bboxKey)}&limit=100`;
    const headers: Record<string, string> = {};
    if (process.env.OPENAQ_API_KEY) {
      headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
    }

    let stations: Station[];
    try {
      const upstream = await fetch(url, { headers });
      if (!upstream.ok) {
        res.status(502).json({ error: `OpenAQ upstream returned ${upstream.status}` });
        return;
      }
      const body = (await upstream.json()) as { results?: OpenAQLocation[] };
      stations = (body.results ?? [])
        .map(normalizeLocation)
        .filter((s): s is Station => s !== null);
    } catch (err) {
      res.status(502).json({
        error: `OpenAQ upstream request failed: ${err instanceof Error ? err.message : 'unknown error'}`
      });
      return;
    }

    cache.set(bboxKey, { expires: Date.now() + CACHE_TTL_MS, stations });
    res.json({ stations, total: stations.length, cached: false });
  })
);

export default router;
