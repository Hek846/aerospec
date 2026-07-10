import bcrypt from 'bcrypt';
import { getPool, closePool } from './pool.js';
import { computeAqi } from '../lib/aqi.js';
import { FACTOR_TAGS } from '@aerospec/types';

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

const ADMIN_READING_INTERVAL_MS = 10 * 60 * 1000;
const NEIGHBOR_READING_INTERVAL_MS = 30 * 60 * 1000;
const ADMIN_DAYS = 35;
const NEIGHBOR_DAYS = 35;
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
  co2: number | null;
  vocIndex: number | null;
  aqi: number | null;
}

interface SimulateOptions {
  days: number;
  intervalMs: number;
  socialRoom: boolean;
  deviceIndex: number;
  baselinePmShift?: number;
  includeCo2Voc?: boolean;
}

interface NeighborSeed {
  name: string;
  email: string;
  lat: number;
  lon: number;
  baselinePmShift: number;
  rooms: RoomSeed[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function simulateReadings(opts: SimulateOptions): SimReading[] {
  const { days, intervalMs, socialRoom, deviceIndex, baselinePmShift = 0, includeCo2Voc = false } = opts;
  const readings: SimReading[] = [];
  const count = Math.floor((days * 24 * 60 * 60 * 1000) / intervalMs);
  const end = Date.now();
  const start = end - count * intervalMs;

  let spikeRemaining = 0;
  let spikePeak = 0;

  for (let i = 0; i < count; i++) {
    const ts = new Date(start + i * intervalMs);
    const hour = ts.getUTCHours() + ts.getUTCMinutes() / 60;
    // Local hour approximation for Lynnwood (UTC-7/8); good enough for demo data
    const localHour = (hour - 7 + 24) % 24;

    // Diurnal base PM2.5: low overnight, bump at breakfast + evening
    let pm25 = 5 + 3 * Math.sin(((localHour - 14) / 24) * 2 * Math.PI) + baselinePmShift;
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
        spikeRemaining = 3 + Math.floor(Math.random() * 6); // 30-80 min at 10-min cadence
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
    // Battery slowly drains across the period, staggered per device (normalized by count)
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

    let co2: number | null = null;
    let vocIndex: number | null = null;

    if (includeCo2Voc) {
      // CO2 daily cycle: 600–1600 ppm, higher during occupied evening hours
      let co2Base = 600;
      if (localHour >= 18 && localHour <= 22) {
        co2Base += 800 + Math.random() * 150;
      } else if (localHour >= 7 && localHour <= 9) {
        co2Base += 150 + Math.random() * 100;
      } else if (localHour >= 12 && localHour <= 14) {
        co2Base += 100 + Math.random() * 80;
      }
      co2 = Math.min(1600, Math.max(600, co2Base + (Math.random() - 0.5) * 60));

      // VOC index: 80–250, spikes correlated with cooking/PM-spike hours
      let voc = 80;
      if (spikeRemaining > 0) {
        voc += 100 + Math.random() * 70;
      } else if (localHour >= 17 && localHour <= 22) {
        voc += 50 + Math.random() * 60;
      } else if (localHour >= 7 && localHour <= 9) {
        voc += 20 + Math.random() * 30;
      }
      vocIndex = Math.min(250, Math.max(80, voc + (Math.random() - 0.5) * 20));
    }

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
      co2: co2 === null ? null : Math.round(co2),
      vocIndex: vocIndex === null ? null : Math.round(vocIndex),
      aqi: computeAqi(round1(pm25Corr), round1(pm25))
    });
  }

  return readings;
}

async function insertReadings(deviceId: string, readings: SimReading[]): Promise<void> {
  const pool = getPool();
  const COLS = 17;

  for (let offset = 0; offset < readings.length; offset += BATCH_SIZE) {
    const batch = readings.slice(offset, offset + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((r, i) => {
      const base = i * COLS;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17})`
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
        r.co2,
        r.vocIndex,
        r.aqi
      );
    });

    await pool.query(
      `INSERT INTO sensor_readings
        (device_id, ts, battery_v, temperature, humidity, pressure, bins,
         pm1_std, pm25_std, pm10_std, pm1_env, pm25_env, pm10_env, pm25_corr, co2, voc_index, aqi)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (device_id, ts) DO NOTHING`,
      values
    );
  }
}

function makeNeighborSeeds(adminLat: number, adminLon: number): NeighborSeed[] {
  return [
    {
      name: 'Lynnwood Neighbor 1',
      email: 'neighbor1@aerospec.io',
      lat: adminLat + 0.008,
      lon: adminLon + 0.012,
      baselinePmShift: -3,
      rooms: [
        { name: 'Main', type: 'LivingRoom', floor: '1', serial: 'AS-N1-01', deviceName: 'Living Room Monitor', socialRoom: true }
      ]
    },
    {
      name: 'Lynnwood Neighbor 2',
      email: 'neighbor2@aerospec.io',
      lat: adminLat - 0.014,
      lon: adminLon + 0.006,
      baselinePmShift: 5,
      rooms: [
        { name: 'Living Room', type: 'LivingRoom', floor: '1', serial: 'AS-N2-01', deviceName: 'Living Room Monitor', socialRoom: true },
        { name: 'Kitchen', type: 'Kitchen', floor: '1', serial: 'AS-N2-02', deviceName: 'Kitchen Monitor', socialRoom: true }
      ]
    },
    {
      name: 'Lynnwood Neighbor 3',
      email: 'neighbor3@aerospec.io',
      lat: adminLat + 0.021,
      lon: adminLon - 0.009,
      baselinePmShift: 12,
      rooms: [
        { name: 'Bedroom', type: 'Bedroom', floor: '2', serial: 'AS-N3-01', deviceName: 'Bedroom Monitor', socialRoom: false }
      ]
    },
    {
      name: 'Lynnwood Neighbor 4',
      email: 'neighbor4@aerospec.io',
      lat: adminLat - 0.006,
      lon: adminLon - 0.022,
      baselinePmShift: -1,
      rooms: [
        { name: 'Family Room', type: 'FamilyRoom', floor: '1', serial: 'AS-N4-01', deviceName: 'Family Room Monitor', socialRoom: true },
        { name: 'Office', type: 'Office', floor: '2', serial: 'AS-N4-02', deviceName: 'Office Monitor', socialRoom: false }
      ]
    },
    {
      name: 'Lynnwood Neighbor 5',
      email: 'neighbor5@aerospec.io',
      lat: adminLat + 0.027,
      lon: adminLon + 0.024,
      baselinePmShift: 8,
      rooms: [
        { name: 'Living Room', type: 'LivingRoom', floor: '1', serial: 'AS-N5-01', deviceName: 'Living Room Monitor', socialRoom: true }
      ]
    }
  ];
}

function makeAnnotationTemplates(): Array<{ tags: string[]; note: string; localHourMin: number; localHourMax: number }> {
  const t = (tag: string) => tag;
  return [
    { tags: [t(FACTOR_TAGS[0])], note: 'Dinner cooking', localHourMin: 17.5, localHourMax: 19.5 },
    { tags: [t(FACTOR_TAGS[0]), t(FACTOR_TAGS[3])], note: 'Big dinner with guests', localHourMin: 18, localHourMax: 20 },
    { tags: [t(FACTOR_TAGS[1])], note: 'Vacuuming and dusting', localHourMin: 9.5, localHourMax: 11.5 },
    { tags: [t(FACTOR_TAGS[2])], note: 'Opened windows for fresh air', localHourMin: 13.5, localHourMax: 16 },
    { tags: [t(FACTOR_TAGS[4])], note: 'Candles lit', localHourMin: 19.5, localHourMax: 21.5 },
    { tags: [t(FACTOR_TAGS[6])], note: 'Air purifier running', localHourMin: 20, localHourMax: 23 },
    { tags: [t(FACTOR_TAGS[8])], note: 'Pet activity', localHourMin: 7, localHourMax: 9 },
    { tags: [t(FACTOR_TAGS[7])], note: 'HVAC running', localHourMin: 11, localHourMax: 14 },
    { tags: [t(FACTOR_TAGS[9])], note: 'Outdoor event nearby', localHourMin: 14, localHourMax: 17 },
    { tags: [t(FACTOR_TAGS[5])], note: 'Indoor smoking', localHourMin: 20, localHourMax: 22 },
    { tags: [t(FACTOR_TAGS[10])], note: 'Unusual activity', localHourMin: 15, localHourMax: 18 }
  ];
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

  const adminLat = 47.8279;
  const adminLon = -122.3053;

  const homeResult = await pool.query<{ id: string }>(
    `INSERT INTO homes (name, lat, lon, city, region, timezone)
     VALUES ('Lynnwood Home', $1, $2, 'Lynnwood', 'WA', 'America/Los_Angeles')
     RETURNING id`,
    [adminLat, adminLon]
  );
  const homeId = homeResult.rows[0]!.id;

  await pool.query(
    `INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'owner')
     ON CONFLICT DO NOTHING`,
    [homeId, adminId]
  );

  const adminDeviceIds: string[] = [];
  const adminRoomDeviceIds: Array<{ roomId: string; deviceId: string }> = [];
  let adminReadingCount = 0;
  let adminBoundsReadings: SimReading[] | null = null;

  for (let i = 0; i < ROOM_SEEDS.length; i++) {
    const seed = ROOM_SEEDS[i]!;

    const roomResult = await pool.query<{ id: string }>(
      `INSERT INTO rooms (home_id, name, type, floor) VALUES ($1, $2, $3, $4) RETURNING id`,
      [homeId, seed.name, seed.type, seed.floor]
    );
    const roomId = roomResult.rows[0]!.id;

    const readings = simulateReadings({
      days: ADMIN_DAYS,
      intervalMs: ADMIN_READING_INTERVAL_MS,
      socialRoom: seed.socialRoom,
      deviceIndex: i,
      includeCo2Voc: true
    });
    if (adminBoundsReadings === null) {
      adminBoundsReadings = readings;
    }
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
    adminDeviceIds.push(deviceId);
    adminRoomDeviceIds.push({ roomId, deviceId });

    await insertReadings(deviceId, readings);
    adminReadingCount += readings.length;
    console.log(`   ${seed.serial} (${seed.name}): ${readings.length} readings`);
  }

  // Neighbor homes for hex-map density
  const neighborSeeds = makeNeighborSeeds(adminLat, adminLon);
  let neighborHomeCount = 0;
  let neighborDeviceCount = 0;
  let neighborReadingCount = 0;

  for (let n = 0; n < neighborSeeds.length; n++) {
    const neighbor = neighborSeeds[n]!;
    const neighborPassword = await bcrypt.hash('aerospec-neighbor', 10);
    const neighborUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [neighbor.email, neighborPassword, neighbor.name]
    );
    const neighborUserId = neighborUserResult.rows[0]!.id;

    const neighborHomeResult = await pool.query<{ id: string }>(
      `INSERT INTO homes (name, lat, lon, city, region, timezone)
       VALUES ($1, $2, $3, 'Lynnwood', 'WA', 'America/Los_Angeles')
       RETURNING id`,
      [neighbor.name, neighbor.lat, neighbor.lon]
    );
    const neighborHomeId = neighborHomeResult.rows[0]!.id;
    neighborHomeCount++;

    await pool.query(
      `INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [neighborHomeId, neighborUserId]
    );

    for (let r = 0; r < neighbor.rooms.length; r++) {
      const roomSeed = neighbor.rooms[r]!;
      const roomResult = await pool.query<{ id: string }>(
        `INSERT INTO rooms (home_id, name, type, floor) VALUES ($1, $2, $3, $4) RETURNING id`,
        [neighborHomeId, roomSeed.name, roomSeed.type, roomSeed.floor]
      );
      const roomId = roomResult.rows[0]!.id;

      const readings = simulateReadings({
        days: NEIGHBOR_DAYS,
        intervalMs: NEIGHBOR_READING_INTERVAL_MS,
        socialRoom: roomSeed.socialRoom,
        deviceIndex: n * 10 + r,
        baselinePmShift: neighbor.baselinePmShift,
        includeCo2Voc: false
      });
      const last = readings[readings.length - 1]!;

      const deviceResult = await pool.query<{ id: string }>(
        `INSERT INTO devices (serial, name, home_id, room_id, firmware_version, last_seen, battery_pct)
         VALUES ($1, $2, $3, $4, '1.2.0', $5, $6)
         ON CONFLICT (serial) DO UPDATE SET home_id = EXCLUDED.home_id, room_id = EXCLUDED.room_id
         RETURNING id`,
        [
          roomSeed.serial,
          roomSeed.deviceName,
          neighborHomeId,
          roomId,
          last.ts.toISOString(),
          Math.round(Math.min(100, Math.max(0, ((last.batteryV - 3.2) / 1.0) * 100)))
        ]
      );
      const deviceId = deviceResult.rows[0]!.id;
      neighborDeviceCount++;

      await insertReadings(deviceId, readings);
      neighborReadingCount += readings.length;
    }
  }

  // Annotations for admin home over the 35-day window
  const annotationTemplates = makeAnnotationTemplates();
  const annotations: Array<{ ts: Date; tags: string[]; note: string; roomId: string | null; deviceId: string | null }> = [];
  const periodStart = adminBoundsReadings![0].ts.getTime();
  const periodEnd = adminBoundsReadings![adminBoundsReadings!.length - 1].ts.getTime();

  for (let i = 0; i < 20; i++) {
    const template = annotationTemplates[i % annotationTemplates.length]!;
    // Spread across the 35-day window with a little randomness
    const dayOffset = Math.min(ADMIN_DAYS - 1, Math.floor((i / 20) * ADMIN_DAYS) + Math.floor(Math.random() * 2));
    const dayMs = periodStart + dayOffset * 24 * 60 * 60 * 1000;
    const localHour = template.localHourMin + Math.random() * (template.localHourMax - template.localHourMin);
    // Convert local hour back to UTC hour (UTC = local + 7)
    const utcHour = (localHour + 7) % 24;
    const ts = new Date(dayMs + utcHour * 60 * 60 * 1000);
    if (ts.getTime() > periodEnd) continue;

    // Attach device/room to roughly one third of annotations
    const withDevice = Math.random() < 0.35;
    const roomDevice = withDevice
      ? adminRoomDeviceIds[Math.floor(Math.random() * adminRoomDeviceIds.length)]!
      : null;

    annotations.push({
      ts,
      tags: template.tags,
      note: template.note,
      roomId: roomDevice ? roomDevice.roomId : null,
      deviceId: roomDevice ? roomDevice.deviceId : null
    });
  }

  for (const annotation of annotations) {
    await pool.query(
      `INSERT INTO annotations (home_id, room_id, device_id, user_id, ts, tags, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [homeId, annotation.roomId, annotation.deviceId, adminId, annotation.ts.toISOString(), annotation.tags, annotation.note]
    );
  }

  // A couple of demo alert rules for the home
  await pool.query(
    `INSERT INTO alert_rules (home_id, metric, threshold_type, threshold_value, enabled, notify_email)
     VALUES ($1, 'pm25', 'above', 35, true, $2), ($1, 'pm10', 'above', 150, true, $2)`,
    [homeId, ADMIN_EMAIL]
  );

  console.log('✅ Seed complete');
  console.log(`   Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Homes: ${1 + neighborHomeCount} | Devices: ${adminDeviceIds.length + neighborDeviceCount} | Readings: ${adminReadingCount + neighborReadingCount} | Annotations: ${annotations.length}`);
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
