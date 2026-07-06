import bcrypt from 'bcrypt';
import { getPool, closePool } from './pool.js';
import { computeAqi } from '../lib/aqi.js';

const ADMIN_EMAIL = 'admin@aerospec.io';
const ADMIN_PASSWORD = 'aerospec-admin';

interface RoomSeed {
  name: string;
  type: string;
  floor: string;
  serial: string;
  deviceName: string;
  /** true for living/family rooms: higher evening PM, more spikes */
  socialRoom: boolean;
}

const ROOM_SEEDS: RoomSeed[] = [
  { name: 'Bedroom 1', type: 'Bedroom', floor: '2', serial: 'AS-0001', deviceName: 'Bedroom 1 Monitor', socialRoom: false },
  { name: 'Bedroom 2', type: 'Bedroom', floor: '2', serial: 'AS-0002', deviceName: 'Bedroom 2 Monitor', socialRoom: false },
  { name: 'Bedroom 3', type: 'Bedroom', floor: '2', serial: 'AS-0003', deviceName: 'Bedroom 3 Monitor', socialRoom: false },
  { name: 'Bedroom 4', type: 'Bedroom', floor: '1', serial: 'AS-0004', deviceName: 'Bedroom 4 Monitor', socialRoom: false },
  { name: 'Living Room', type: 'LivingRoom', floor: '1', serial: 'AS-0005', deviceName: 'Living Room Monitor', socialRoom: true },
  { name: 'Family Room', type: 'FamilyRoom', floor: '1', serial: 'AS-0006', deviceName: 'Family Room Monitor', socialRoom: true }
];

const READING_INTERVAL_MS = 10 * 60 * 1000;
const DAYS = 7;
const BATCH_SIZE = 500;

interface SimReading {
  ts: Date;
  batteryV: number;
  temperature: number;
  humidity: number;
  pressure: number;
  bins: number[];
  pm1Std: number;
  pm25Std: number;
  pm10Std: number;
  pm1Env: number;
  pm25Env: number;
  pm10Env: number;
  pm25Corr: number;
  aqi: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function simulateReadings(socialRoom: boolean, deviceIndex: number): SimReading[] {
  const readings: SimReading[] = [];
  const count = (DAYS * 24 * 60) / 10;
  const end = Date.now();
  const start = end - count * READING_INTERVAL_MS;

  let spikeRemaining = 0;
  let spikePeak = 0;

  for (let i = 0; i < count; i++) {
    const ts = new Date(start + i * READING_INTERVAL_MS);
    const hour = ts.getUTCHours() + ts.getUTCMinutes() / 60;
    // Local hour approximation for Lynnwood (UTC-7/8); good enough for demo data
    const localHour = (hour - 7 + 24) % 24;

    // Diurnal base PM2.5: low overnight, bump at breakfast + evening
    let pm25 = 5 + 3 * Math.sin(((localHour - 14) / 24) * 2 * Math.PI);
    if (localHour >= 17 && localHour <= 22) {
      pm25 += socialRoom ? 12 : 3; // cooking / activity in shared spaces
    }
    if (localHour >= 7 && localHour <= 9) {
      pm25 += socialRoom ? 5 : 2;
    }
    pm25 += (Math.random() - 0.5) * 3;

    // Occasional spikes, more likely in social rooms during evenings
    if (spikeRemaining === 0) {
      const spikeChance = socialRoom && localHour >= 17 && localHour <= 22 ? 0.02 : 0.003;
      if (Math.random() < spikeChance) {
        spikeRemaining = 3 + Math.floor(Math.random() * 6); // 30-80 min
        spikePeak = 70 + Math.random() * 50;
      }
    }
    if (spikeRemaining > 0) {
      pm25 = Math.max(pm25, spikePeak * (0.6 + Math.random() * 0.4));
      spikeRemaining--;
    }
    pm25 = Math.max(0.5, pm25);

    const pm1 = pm25 * (0.55 + Math.random() * 0.15);
    const pm10 = pm25 * (1.15 + Math.random() * 0.25);
    const humidity = 35 + 10 * Math.sin(((localHour - 4) / 24) * 2 * Math.PI) + 5 + (Math.random() - 0.5) * 4;
    const temperature = 19 + 2.5 * Math.sin(((localHour - 15) / 24) * 2 * Math.PI) + 2.5 + (Math.random() - 0.5) * 0.8;
    const pressure = 1013 + (Math.random() - 0.5) * 6;
    // Battery slowly drains across the week, staggered per device
    const batteryV = Math.max(
      3.7,
      4.1 - 0.35 * (i / count) - deviceIndex * 0.005 + (Math.random() - 0.5) * 0.02
    );
    // Simple EPA-style humidity correction (hygroscopic growth deflation)
    const pm25Corr = pm25 / (1 + 0.25 * Math.pow(Math.min(humidity, 95) / 100, 2));

    const bins = [
      Math.round(pm25 * 180 + Math.random() * 120),
      Math.round(pm25 * 55 + Math.random() * 40),
      Math.round(pm25 * 11 + Math.random() * 10),
      Math.round(pm25 * 1.6 + Math.random() * 3),
      Math.round(pm25 * 0.35 + Math.random() * 1.5),
      Math.round(pm25 * 0.12 + Math.random())
    ];

    readings.push({
      ts,
      batteryV: Math.round(batteryV * 100) / 100,
      temperature: round1(temperature),
      humidity: round1(humidity),
      pressure: round1(pressure),
      bins,
      pm1Std: round1(pm1),
      pm25Std: round1(pm25),
      pm10Std: round1(pm10),
      pm1Env: round1(pm1),
      pm25Env: round1(pm25),
      pm10Env: round1(pm10),
      pm25Corr: round1(pm25Corr),
      aqi: computeAqi(round1(pm25Corr), round1(pm25))
    });
  }

  return readings;
}

async function insertReadings(deviceId: string, readings: SimReading[]): Promise<void> {
  const pool = getPool();
  const COLS = 15;

  for (let offset = 0; offset < readings.length; offset += BATCH_SIZE) {
    const batch = readings.slice(offset, offset + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((r, i) => {
      const base = i * COLS;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15})`
      );
      values.push(
        deviceId,
        r.ts.toISOString(),
        r.batteryV,
        r.temperature,
        r.humidity,
        r.pressure,
        JSON.stringify(r.bins),
        r.pm1Std,
        r.pm25Std,
        r.pm10Std,
        r.pm1Env,
        r.pm25Env,
        r.pm10Env,
        r.pm25Corr,
        r.aqi
      );
    });

    await pool.query(
      `INSERT INTO sensor_readings
        (device_id, ts, battery_v, temperature, humidity, pressure, bins,
         pm1_std, pm25_std, pm10_std, pm1_env, pm25_env, pm10_env, pm25_corr, aqi)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (device_id, ts) DO NOTHING`,
      values
    );
  }
}

export async function seedDatabase(): Promise<void> {
  const pool = getPool();

  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const userResult = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [ADMIN_EMAIL, passwordHash, 'AeroSpec Admin']
  );
  const adminId = userResult.rows[0]!.id;

  const homeResult = await pool.query<{ id: string }>(
    `INSERT INTO homes (name, lat, lon, city, region, timezone)
     VALUES ('Lynnwood Home', 47.8279, -122.3053, 'Lynnwood', 'WA', 'America/Los_Angeles')
     RETURNING id`
  );
  const homeId = homeResult.rows[0]!.id;

  await pool.query(
    `INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'owner')
     ON CONFLICT DO NOTHING`,
    [homeId, adminId]
  );

  for (let i = 0; i < ROOM_SEEDS.length; i++) {
    const seed = ROOM_SEEDS[i]!;

    const roomResult = await pool.query<{ id: string }>(
      `INSERT INTO rooms (home_id, name, type, floor) VALUES ($1, $2, $3, $4) RETURNING id`,
      [homeId, seed.name, seed.type, seed.floor]
    );
    const roomId = roomResult.rows[0]!.id;

    const readings = simulateReadings(seed.socialRoom, i);
    const last = readings[readings.length - 1]!;

    const deviceResult = await pool.query<{ id: string }>(
      `INSERT INTO devices (serial, name, home_id, room_id, firmware_version, last_seen, battery_pct)
       VALUES ($1, $2, $3, $4, '1.2.0', $5, $6)
       ON CONFLICT (serial) DO UPDATE SET home_id = EXCLUDED.home_id, room_id = EXCLUDED.room_id
       RETURNING id`,
      [
        seed.serial,
        seed.deviceName,
        homeId,
        roomId,
        last.ts.toISOString(),
        Math.round(Math.min(100, Math.max(0, ((last.batteryV - 3.2) / 1.0) * 100)))
      ]
    );
    const deviceId = deviceResult.rows[0]!.id;

    await insertReadings(deviceId, readings);
    console.log(`   ${seed.serial} (${seed.name}): ${readings.length} readings`);
  }

  // A couple of demo alert rules for the home
  await pool.query(
    `INSERT INTO alert_rules (home_id, metric, threshold_type, threshold_value, enabled, notify_email)
     VALUES ($1, 'pm25', 'above', 35, true, $2), ($1, 'pm10', 'above', 150, true, $2)`,
    [homeId, ADMIN_EMAIL]
  );

  console.log('✅ Seed complete');
  console.log(`   Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

/** Seed only when the users table is empty (used with SEED_ON_BOOT=true). */
export async function seedIfEmpty(): Promise<boolean> {
  const result = await getPool().query<{ count: string }>('SELECT count(*) FROM users');
  if (Number(result.rows[0]!.count) > 0) {
    return false;
  }
  await seedDatabase();
  return true;
}

const isDirectRun = process.argv[1]
  ? process.argv[1].endsWith('/seed.ts') || process.argv[1].endsWith('/seed.js')
  : false;

if (isDirectRun) {
  const { config } = await import('dotenv');
  config();
  try {
    const { runMigrations } = await import('./migrate.js');
    await runMigrations();
    await seedDatabase();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
