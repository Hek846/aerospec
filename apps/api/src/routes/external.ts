import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { pm25ToAqi } from '../lib/aqi.js';
import { parseBbox, type Bbox } from './map.js';

const router: Router = express.Router();

const OPENAQ_BASE = 'https://api.openaq.org/v3/locations';
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface Station {
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
    id?: number;
    parameter?: { name?: string };
  }>;
}

interface OpenAQLatestRow {
  value?: number;
  sensorsId?: number;
  datetime?: { utc?: string };
}

// Skip stations that have not reported in a week; they render as dead markers.
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
// Cap per-station /latest fan-out per proxy request (results are cached 10 min).
const MAX_STATIONS = 50;

function lastUpdatedOf(loc: OpenAQLocation): string | null {
  if (typeof loc.datetimeLast === 'string') {
    return loc.datetimeLast;
  }
  if (loc.datetimeLast && typeof loc.datetimeLast.utc === 'string') {
    return loc.datetimeLast.utc;
  }
  return null;
}

/**
 * OpenAQ v3 no longer embeds latest values in /locations, so fetch each
 * station's /latest and match rows against the station's pm25 sensor id.
 */
async function fetchStation(
  loc: OpenAQLocation,
  headers: Record<string, string>
): Promise<Station | null> {
  const lat = loc.coordinates?.latitude;
  const lon = loc.coordinates?.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || loc.id === undefined) {
    return null;
  }

  const pm25SensorIds = new Set(
    (loc.sensors ?? [])
      .filter((s) => s.parameter?.name === 'pm25' && typeof s.id === 'number')
      .map((s) => s.id as number)
  );

  let pm25: number | null = null;
  let measuredAt: string | null = null;
  try {
    const upstream = await fetch(`${OPENAQ_BASE}/${loc.id}/latest`, { headers });
    if (upstream.ok) {
      const body = (await upstream.json()) as { results?: OpenAQLatestRow[] };
      const row = (body.results ?? []).find(
        (r) =>
          typeof r.value === 'number' &&
          typeof r.sensorsId === 'number' &&
          pm25SensorIds.has(r.sensorsId)
      );
      if (row) {
        pm25 = row.value as number;
        measuredAt = row.datetime?.utc ?? null;
      }
    }
  } catch {
    // Station stays on the map without a reading rather than failing the request.
  }

  return {
    id: loc.id,
    name: loc.name ?? 'Unknown station',
    lat,
    lon,
    pm25,
    aqi: pm25ToAqi(pm25),
    lastUpdated: measuredAt ?? lastUpdatedOf(loc)
  };
}

function bboxKey(bbox: Bbox): string {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
}

/**
 * Fetch OpenAQ stations for a bounding box, using the same in-memory cache
 * as the /external/openaq/latest endpoint. Returns `{ stations, cached }`.
 * Throws when the upstream list request fails so callers can decide how to
 * degrade.
 */
export async function fetchOpenAqStationsForBbox(
  bbox: Bbox
): Promise<{ stations: Station[]; cached: boolean }> {
  const key = bboxKey(bbox);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return { stations: cached.stations, cached: true };
  }

  const headers: Record<string, string> = {};
  if (process.env.OPENAQ_API_KEY) {
    headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
  }

  // parameters_id=2 keeps only stations that actually have a pm25 sensor
  const url = `${OPENAQ_BASE}?bbox=${encodeURIComponent(key)}&parameters_id=2&limit=100`;
  const upstream = await fetch(url, { headers });
  if (!upstream.ok) {
    throw new Error(`OpenAQ upstream returned ${upstream.status}`);
  }

  const body = (await upstream.json()) as { results?: OpenAQLocation[] };
  const staleCutoff = Date.now() - STALE_MS;
  const active = (body.results ?? [])
    .filter((loc) => {
      const last = lastUpdatedOf(loc);
      return last !== null && new Date(last).getTime() >= staleCutoff;
    })
    .slice(0, MAX_STATIONS);
  const resolved = await Promise.all(active.map((loc) => fetchStation(loc, headers)));
  const stations = resolved.filter((s): s is Station => s !== null);

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, stations });
  return { stations, cached: false };
}

// GET /external/openaq/latest?bbox=minLon,minLat,maxLon,maxLat
router.get(
  '/openaq/latest',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const bbox = parseBbox(req.query.bbox);

    try {
      const { stations, cached } = await fetchOpenAqStationsForBbox(bbox);
      res.json({ stations, total: stations.length, cached });
    } catch (err) {
      res.status(502).json({
        error: `OpenAQ upstream request failed: ${err instanceof Error ? err.message : 'unknown error'}`
      });
    }
  })
);

export default router;
