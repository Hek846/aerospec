import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the migrations directory: alongside this file when running from
 * src (tsx) or in Docker (the image copies src/db/migrations into dist),
 * falling back to src/db/migrations for a plain local `tsc && node dist`.
 */
function resolveMigrationsDir(): string {
  const local = join(__dirname, 'migrations');
  if (existsSync(local)) return local;
  const fromDist = join(__dirname, '../../src/db/migrations');
  if (existsSync(fromDist)) return fromDist;
  throw new Error(`Migrations directory not found (looked in ${local} and ${fromDist})`);
}

const MIGRATIONS_DIR = resolveMigrationsDir();

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Serialize concurrent boots (e.g. several API replicas starting at once)
    await client.query('SELECT pg_advisory_lock(727027)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations'
    );
    const applied = new Set(appliedResult.rows.map((r) => r.id));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`⏫ Applying migration ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      console.log(`✅ Applied ${file}`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727027)').catch(() => undefined);
    client.release();
  }
}

// Allow running standalone: pnpm --filter @aerospec/api db:migrate
const isDirectRun = process.argv[1]
  ? import.meta.url === new URL(`file://${process.argv[1]}`).href ||
    process.argv[1].endsWith('/migrate.ts') ||
    process.argv[1].endsWith('/migrate.js')
  : false;

if (isDirectRun) {
  const { config } = await import('dotenv');
  config();
  try {
    await runMigrations();
    console.log('All migrations applied');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
