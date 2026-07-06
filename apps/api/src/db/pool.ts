import pg from 'pg';

let pool: pg.Pool | null = null;

/**
 * Lazily create the pool so DATABASE_URL is read after dotenv.config()
 * has run (ESM imports would otherwise evaluate before it).
 */
export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://aerospec:aerospec@localhost:5432/aerospec'
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

let timescaleAvailable: boolean | null = null;

/** True when the timescaledb extension is installed (cached per process). */
export async function isTimescaleAvailable(): Promise<boolean> {
  if (timescaleAvailable === null) {
    const result = await getPool().query(
      "SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'"
    );
    timescaleAvailable = (result.rowCount ?? 0) > 0;
  }
  return timescaleAvailable;
}
