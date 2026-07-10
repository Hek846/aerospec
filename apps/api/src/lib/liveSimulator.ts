import { getPool } from '../db/pool.js';
import { computeAqi } from './aqi.js';

/**
 * Dev-only live data simulator (enabled with SIMULATE_LIVE=true).
 *
 * Seeded demo data ends at seed time, so a few minutes later every device
 * drops to "offline" and charts stop moving. This ticker keeps the demo
 * alive: each interval it extends every device's series with a new reading
 * random-walked from its latest one, and advances last_seen the same way
 * the ingest route does.
 */

const TICK_MS = 2 * 60 * 1000;

interface LatestReading {
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  pm25_env: number | null;
  pm10_env: number | null;
  pm1_env: number | null;
  pm25_corr: number | null;
  battery_v: number | null;
  co2: number | null;
  voc_index: number | null;
}

function walk(value: number | null, step: number, min: number, max: number): number | null {
  if (value === null) return null;
  const next = value + (Math.random() * 2 - 1) * step;
  return Math.min(max, Math.max(min, Math.round(next * 100) / 100));
}

async function tick(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<LatestReading>(
    `SELECT DISTINCT ON (device_id)
            device_id, temperature, humidity, pressure,
            pm1_env, pm25_env, pm10_env, pm25_corr, battery_v, co2, voc_index
       FROM sensor_readings
      ORDER BY device_id, ts DESC`
  );

  const now = new Date();
  for (const r of rows) {
    const pm25Env = walk(r.pm25_env, 0.8, 0.5, 150);
    const pm25Corr = walk(r.pm25_corr ?? r.pm25_env, 0.8, 0.5, 150);
    await pool.query(
      `INSERT INTO sensor_readings
         (device_id, ts, battery_v, temperature, humidity, pressure,
          pm1_env, pm25_env, pm10_env, pm25_corr, co2, voc_index, aqi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (device_id, ts) DO NOTHING`,
      [
        r.device_id,
        now.toISOString(),
        r.battery_v,
        walk(r.temperature, 0.2, 10, 35),
        walk(r.humidity, 0.8, 20, 80),
        walk(r.pressure, 0.3, 980, 1040),
        walk(r.pm1_env, 0.5, 0.2, 100),
        pm25Env,
        walk(r.pm10_env, 1.0, 0.5, 200),
        pm25Corr,
        walk(r.co2, 15, 400, 2500),
        walk(r.voc_index, 5, 10, 400),
        computeAqi(pm25Corr, pm25Env),
      ]
    );
    await pool.query(
      `UPDATE devices
          SET last_seen = GREATEST(coalesce(last_seen, 'epoch'::timestamptz), $2::timestamptz)
        WHERE id = $1`,
      [r.device_id, now.toISOString()]
    );
  }
}

export function startLiveSimulator(): void {
  const run = () => {
    tick().catch(err => console.error('live simulator tick failed:', err));
  };
  run();
  setInterval(run, TICK_MS).unref();
  console.log(`🔄 Live data simulator running (every ${TICK_MS / 60000} min)`);
}
