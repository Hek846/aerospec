import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import { getDeviceRowById, getUserHomeIds } from '../db/queries.js';
import { computeAqi, batteryVoltageToPercent } from '../lib/aqi.js';

const router: Router = express.Router();

const MAX_READINGS = 500;

interface IngestReading {
  ts: string;
  batteryV?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  bins?: number[] | null;
  pm1Std?: number | null;
  pm25Std?: number | null;
  pm10Std?: number | null;
  pm1Env?: number | null;
  pm25Env?: number | null;
  pm10Env?: number | null;
  pm25Corr?: number | null;
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseReading(raw: unknown, index: number): IngestReading & { tsDate: Date } {
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError(`readings[${index}] must be an object`, 400);
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.ts !== 'string') {
    throw new AppError(`readings[${index}].ts is required (ISO timestamp)`, 400);
  }
  const tsDate = new Date(r.ts);
  if (Number.isNaN(tsDate.getTime())) {
    throw new AppError(`readings[${index}].ts is not a valid timestamp`, 400);
  }

  const bins =
    Array.isArray(r.bins) && r.bins.every((b) => typeof b === 'number')
      ? (r.bins as number[])
      : null;

  return {
    ts: r.ts,
    tsDate,
    batteryV: numOrNull(r.batteryV),
    temperature: numOrNull(r.temperature),
    humidity: numOrNull(r.humidity),
    pressure: numOrNull(r.pressure),
    bins,
    pm1Std: numOrNull(r.pm1Std),
    pm25Std: numOrNull(r.pm25Std),
    pm10Std: numOrNull(r.pm10Std),
    pm1Env: numOrNull(r.pm1Env),
    pm25Env: numOrNull(r.pm25Env),
    pm10Env: numOrNull(r.pm10Env),
    pm25Corr: numOrNull(r.pm25Corr)
  };
}

// POST /ingest/readings - Batch upload readings for a claimed device
router.post(
  '/readings',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { deviceId, readings } = req.body as {
      deviceId?: unknown;
      source?: unknown;
      readings?: unknown;
    };

    if (typeof deviceId !== 'string' || deviceId.length === 0) {
      throw new AppError('deviceId is required', 400);
    }
    if (!Array.isArray(readings) || readings.length === 0) {
      throw new AppError('readings must be a non-empty array', 400);
    }
    if (readings.length > MAX_READINGS) {
      throw new AppError(`Maximum ${MAX_READINGS} readings per request`, 400);
    }

    const device = await getDeviceRowById(deviceId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }
    if (req.user!.role !== 'admin') {
      const homeIds = await getUserHomeIds(req.user!.userId);
      if (!device.home_id || !homeIds.includes(device.home_id)) {
        throw new AppError('Device is not claimed by one of your homes', 403);
      }
    }

    const parsed = readings.map((raw, i) => parseReading(raw, i));

    const COLS = 15;
    const values: unknown[] = [];
    const placeholders: string[] = [];

    parsed.forEach((r, i) => {
      const base = i * COLS;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15})`
      );
      values.push(
        deviceId,
        r.tsDate.toISOString(),
        r.batteryV,
        r.temperature,
        r.humidity,
        r.pressure,
        r.bins ? JSON.stringify(r.bins) : null,
        r.pm1Std,
        r.pm25Std,
        r.pm10Std,
        r.pm1Env,
        r.pm25Env,
        r.pm10Env,
        r.pm25Corr,
        computeAqi(r.pm25Corr, r.pm25Env)
      );
    });

    const pool = getPool();
    const insertResult = await pool.query(
      `INSERT INTO sensor_readings
        (device_id, ts, battery_v, temperature, humidity, pressure, bins,
         pm1_std, pm25_std, pm10_std, pm1_env, pm25_env, pm10_env, pm25_corr, aqi)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (device_id, ts) DO NOTHING`,
      values
    );

    const inserted = insertResult.rowCount ?? 0;
    const duplicates = parsed.length - inserted;

    // Track device liveness: newest timestamp + battery from that reading
    const newest = parsed.reduce((a, b) => (a.tsDate > b.tsDate ? a : b));
    const latestBattery = [...parsed]
      .sort((a, b) => b.tsDate.getTime() - a.tsDate.getTime())
      .find((r) => r.batteryV !== null && r.batteryV !== undefined);
    const batteryPct = batteryVoltageToPercent(latestBattery?.batteryV ?? null);

    await pool.query(
      `UPDATE devices
          SET last_seen = GREATEST(coalesce(last_seen, 'epoch'::timestamptz), $2::timestamptz),
              battery_pct = coalesce($3::real, battery_pct)
        WHERE id = $1`,
      [deviceId, newest.tsDate.toISOString(), batteryPct]
    );

    res.json({ inserted, duplicates });
  })
);

export default router;
