import { getPool, isTimescaleAvailable } from './pool.js';

/** Device is "online" when last_seen is within this many minutes. */
export const ONLINE_WINDOW_MINUTES = 10;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface HomeRow {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  city: string | null;
  region: string | null;
  timezone: string;
  owner_id: string | null;
  room_ids: string[] | null;
}

export interface RoomRow {
  id: string;
  home_id: string;
  name: string;
  type: string;
  floor: string;
  device_id: string | null;
}

export interface DeviceRow {
  id: string;
  serial: string;
  name: string;
  home_id: string | null;
  room_id: string | null;
  firmware_version: string | null;
  last_seen: Date | null;
  battery_pct: number | null;
}

export interface ReadingRow {
  device_id: string;
  ts: Date;
  battery_v: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  pm1_std: number | null;
  pm25_std: number | null;
  pm10_std: number | null;
  pm1_env: number | null;
  pm25_env: number | null;
  pm10_env: number | null;
  pm25_corr: number | null;
  co2: number | null;
  voc_index: number | null;
  noise_db: number | null;
  aqi: number | null;
}

export interface AlertRuleRow {
  id: string;
  home_id: string | null;
  device_id: string | null;
  metric: string;
  threshold_type: string;
  threshold_value: number;
  enabled: boolean;
  notify_email: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface AlertEventRow {
  id: string;
  rule_id: string;
  device_id: string;
  ts: Date;
  metric: string;
  value: number;
  status: string;
}

// ---------------------------------------------------------------------------
// API shapes (mirror what the web frontend consumes)
// ---------------------------------------------------------------------------

export interface ApiHome {
  id: string;
  ownerId: string;
  name: string;
  location: { city: string; region: string; lat: number; lon: number };
  timezone: string;
  configProfileId: string;
  roomIds: string[];
}

export interface ApiReading {
  deviceId: string;
  timestamp: string;
  pm25: number | null;
  pm10: number | null;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  vocIndex: number | null;
  noiseDb: number | null;
  aqi: number | null;
  anomalyFlags: string[];
}

export interface ApiDevice {
  id: string;
  homeId: string | null;
  roomId: string | null;
  name: string;
  deploymentId: string;
  tags: string[];
  firmwareVersion: string | null;
  status: 'online' | 'offline';
  lastSeen: string | null;
  wifiRssi: number | null;
  batteryLevel: number | null;
}

export interface ApiAlertRule {
  id: string;
  homeId?: string;
  deviceId?: string;
  metric: string;
  thresholdType: string;
  thresholdValue: number;
  enabled: boolean;
  notifyEmail: string;
  quietHours: { start: string; end: string };
}

export interface ApiAlertEvent {
  id: string;
  ruleId: string;
  deviceId: string;
  timestamp: string;
  metric: string;
  value: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function deviceStatus(lastSeen: Date | null): 'online' | 'offline' {
  if (!lastSeen) return 'offline';
  return Date.now() - lastSeen.getTime() < ONLINE_WINDOW_MINUTES * 60 * 1000
    ? 'online'
    : 'offline';
}

export function mapHome(row: HomeRow): ApiHome {
  return {
    id: row.id,
    ownerId: row.owner_id ?? '',
    name: row.name,
    location: {
      city: row.city ?? '',
      region: row.region ?? '',
      lat: row.lat ?? 0,
      lon: row.lon ?? 0
    },
    timezone: row.timezone,
    // Legacy field kept for frontend compatibility; profiles are not in the DB.
    configProfileId: 'profile-standard',
    roomIds: row.room_ids ?? []
  };
}

export function mapRoom(row: RoomRow) {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    type: row.type,
    floor: row.floor,
    deviceId: row.device_id ?? ''
  };
}

export function mapDevice(row: DeviceRow): ApiDevice {
  return {
    id: row.id,
    homeId: row.home_id,
    roomId: row.room_id,
    name: row.name,
    deploymentId: row.serial,
    tags: [],
    firmwareVersion: row.firmware_version,
    status: deviceStatus(row.last_seen),
    lastSeen: row.last_seen ? row.last_seen.toISOString() : null,
    wifiRssi: null,
    batteryLevel: row.battery_pct === null ? null : Math.round(row.battery_pct)
  };
}

export function mapReading(row: ReadingRow): ApiReading {
  return {
    deviceId: row.device_id,
    timestamp: row.ts.toISOString(),
    pm25: row.pm25_corr ?? row.pm25_env,
    pm10: row.pm10_env ?? row.pm10_std,
    co2: row.co2,
    temperature: row.temperature,
    humidity: row.humidity,
    pressure: row.pressure,
    vocIndex: row.voc_index,
    noiseDb: row.noise_db,
    aqi: row.aqi === null ? null : Math.round(row.aqi),
    anomalyFlags: []
  };
}

export function mapAlertRule(row: AlertRuleRow): ApiAlertRule {
  return {
    id: row.id,
    ...(row.home_id ? { homeId: row.home_id } : {}),
    ...(row.device_id ? { deviceId: row.device_id } : {}),
    metric: row.metric,
    thresholdType: row.threshold_type,
    thresholdValue: row.threshold_value,
    enabled: row.enabled,
    notifyEmail: row.notify_email,
    quietHours: { start: row.quiet_hours_start, end: row.quiet_hours_end }
  };
}

export function mapAlertEvent(row: AlertEventRow): ApiAlertEvent {
  return {
    id: row.id,
    ruleId: row.rule_id,
    deviceId: row.device_id,
    timestamp: row.ts.toISOString(),
    metric: row.metric,
    value: row.value,
    status: row.status
  };
}

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guard against malformed ids: Postgres errors on invalid uuid casts. */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function getUserHomeIds(userId: string): Promise<string[]> {
  const result = await getPool().query<{ home_id: string }>(
    'SELECT home_id FROM home_members WHERE user_id = $1',
    [userId]
  );
  return result.rows.map((r) => r.home_id);
}

export async function userHasHomeAccess(
  userId: string,
  homeId: string,
  role?: 'user' | 'admin'
): Promise<boolean> {
  if (!isUuid(homeId)) return false;
  if (role === 'admin') return true;
  const result = await getPool().query(
    'SELECT 1 FROM home_members WHERE user_id = $1 AND home_id = $2',
    [userId, homeId]
  );
  return (result.rowCount ?? 0) > 0;
}

const HOME_SELECT = `
  SELECT h.id, h.name, h.lat, h.lon, h.city, h.region, h.timezone,
         (SELECT hm.user_id FROM home_members hm
           WHERE hm.home_id = h.id AND hm.role = 'owner' LIMIT 1) AS owner_id,
         (SELECT array_agg(r.id ORDER BY r.created_at)
            FROM rooms r WHERE r.home_id = h.id) AS room_ids
    FROM homes h
`;

export async function getHomesForUser(userId: string): Promise<ApiHome[]> {
  const result = await getPool().query<HomeRow>(
    `${HOME_SELECT}
     WHERE h.id IN (SELECT home_id FROM home_members WHERE user_id = $1)
     ORDER BY h.created_at`,
    [userId]
  );
  return result.rows.map(mapHome);
}

export async function getHomeById(homeId: string): Promise<ApiHome | null> {
  const result = await getPool().query<HomeRow>(`${HOME_SELECT} WHERE h.id = $1`, [homeId]);
  const row = result.rows[0];
  return row ? mapHome(row) : null;
}

const ROOM_SELECT = `
  SELECT r.id, r.home_id, r.name, r.type, r.floor,
         (SELECT d.id FROM devices d WHERE d.room_id = r.id
           ORDER BY d.created_at LIMIT 1) AS device_id
    FROM rooms r
`;

export async function getRoomsByHomeId(homeId: string) {
  const result = await getPool().query<RoomRow>(
    `${ROOM_SELECT} WHERE r.home_id = $1 ORDER BY r.created_at`,
    [homeId]
  );
  return result.rows.map(mapRoom);
}

export async function getRoomById(roomId: string) {
  if (!isUuid(roomId)) return null;
  const result = await getPool().query<RoomRow>(`${ROOM_SELECT} WHERE r.id = $1`, [roomId]);
  const row = result.rows[0];
  return row ? mapRoom(row) : null;
}

export async function getDeviceRowById(deviceId: string): Promise<DeviceRow | null> {
  if (!isUuid(deviceId)) return null;
  const result = await getPool().query<DeviceRow>(
    `SELECT id, serial, name, home_id, room_id, firmware_version, last_seen, battery_pct
       FROM devices WHERE id = $1`,
    [deviceId]
  );
  return result.rows[0] ?? null;
}

export async function getLatestReading(deviceId: string): Promise<ApiReading | null> {
  const result = await getPool().query<ReadingRow>(
    `SELECT * FROM sensor_readings WHERE device_id = $1 ORDER BY ts DESC LIMIT 1`,
    [deviceId]
  );
  const row = result.rows[0];
  return row ? mapReading(row) : null;
}

// ---------------------------------------------------------------------------
// Time-range helpers
// ---------------------------------------------------------------------------

export type ReadingRange = '24h' | '7d' | '30d';

export function parseRange(raw: unknown): ReadingRange {
  return raw === '7d' || raw === '30d' ? raw : '24h';
}

export function rangeToHours(range: ReadingRange): number {
  switch (range) {
    case '7d':
      return 7 * 24;
    case '30d':
      return 30 * 24;
    default:
      return 24;
  }
}

/**
 * Fetch readings for a device over a range, downsampled with
 * time_bucket (TimescaleDB) or date_bin (plain Postgres) so 7d/30d stay
 * under ~500 points. Returned ascending by timestamp.
 */
export async function getReadingsForRange(
  deviceId: string,
  range: ReadingRange
): Promise<ApiReading[]> {
  const pool = getPool();
  const hours = rangeToHours(range);

  if (range === '24h') {
    const result = await pool.query<ReadingRow>(
      `SELECT * FROM sensor_readings
        WHERE device_id = $1 AND ts >= now() - make_interval(hours => $2)
        ORDER BY ts ASC`,
      [deviceId, hours]
    );
    return result.rows.map(mapReading);
  }

  // 7d -> 30-minute buckets (336 pts), 30d -> 2-hour buckets (360 pts)
  const bucketMinutes = range === '7d' ? 30 : 120;
  const timescale = await isTimescaleAvailable();
  const bucketExpr = timescale
    ? `time_bucket(make_interval(mins => $3), ts)`
    : `date_bin(make_interval(mins => $3), ts, TIMESTAMPTZ '2000-01-01')`;

  const result = await pool.query<ReadingRow>(
    `SELECT device_id,
            ${bucketExpr} AS ts,
            avg(battery_v)::real AS battery_v,
            avg(temperature)::real AS temperature,
            avg(humidity)::real AS humidity,
            avg(pressure)::real AS pressure,
            avg(pm1_std)::real AS pm1_std,
            avg(pm25_std)::real AS pm25_std,
            avg(pm10_std)::real AS pm10_std,
            avg(pm1_env)::real AS pm1_env,
            avg(pm25_env)::real AS pm25_env,
            avg(pm10_env)::real AS pm10_env,
            avg(pm25_corr)::real AS pm25_corr,
            avg(co2)::real AS co2,
            avg(voc_index)::real AS voc_index,
            avg(noise_db)::real AS noise_db,
            avg(aqi)::real AS aqi
       FROM sensor_readings
      WHERE device_id = $1 AND ts >= now() - make_interval(hours => $2)
      GROUP BY device_id, 2
      ORDER BY ts ASC`,
    [deviceId, hours, bucketMinutes]
  );
  return result.rows.map(mapReading);
}

/** Raw (non-bucketed) readings in range, ascending — used by exports. */
export async function getRawReadingsForRange(
  deviceId: string,
  range: ReadingRange
): Promise<ApiReading[]> {
  const result = await getPool().query<ReadingRow>(
    `SELECT * FROM sensor_readings
      WHERE device_id = $1 AND ts >= now() - make_interval(hours => $2)
      ORDER BY ts ASC`,
    [deviceId, rangeToHours(range)]
  );
  return result.rows.map(mapReading);
}
