-- AeroSpec initial schema (see docs/PIPELINE.md section 3)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- TimescaleDB is optional: plain Postgres must still work.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'timescaledb extension not available, continuing with plain Postgres';
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  lat        double precision,
  lon        double precision,
  city       text,
  region     text,
  timezone   text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS home_members (
  home_id uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (home_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_home_members_user ON home_members(user_id);

CREATE TABLE IF NOT EXISTS rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id    uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL DEFAULT 'Other',
  floor      text NOT NULL DEFAULT '1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_home ON rooms(home_id);

CREATE TABLE IF NOT EXISTS devices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial           text NOT NULL UNIQUE,
  name             text NOT NULL,
  home_id          uuid REFERENCES homes(id) ON DELETE SET NULL,
  room_id          uuid REFERENCES rooms(id) ON DELETE SET NULL,
  firmware_version text,
  last_seen        timestamptz,
  battery_pct      real,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_home ON devices(home_id);
CREATE INDEX IF NOT EXISTS idx_devices_room ON devices(room_id);

CREATE TABLE IF NOT EXISTS sensor_readings (
  device_id   uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ts          timestamptz NOT NULL,
  battery_v   real,
  temperature real,
  humidity    real,
  pressure    real,
  bins        jsonb,
  pm1_std     real,
  pm25_std    real,
  pm10_std    real,
  pm1_env     real,
  pm25_env    real,
  pm10_env    real,
  pm25_corr   real,
  co2         real,
  voc_index   real,
  noise_db    real,
  aqi         real,
  PRIMARY KEY (device_id, ts)
);

-- Convert to hypertable when TimescaleDB is present; harmless no-op otherwise.
DO $$
BEGIN
  PERFORM create_hypertable('sensor_readings', 'ts', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'create_hypertable skipped (TimescaleDB not installed)';
END
$$;

CREATE INDEX IF NOT EXISTS idx_sensor_readings_ts ON sensor_readings(ts DESC);

CREATE TABLE IF NOT EXISTS alert_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id           uuid REFERENCES homes(id) ON DELETE CASCADE,
  device_id         uuid REFERENCES devices(id) ON DELETE CASCADE,
  metric            text NOT NULL CHECK (metric IN ('pm25', 'pm10', 'co2', 'vocIndex', 'noiseDb')),
  threshold_type    text NOT NULL DEFAULT 'above' CHECK (threshold_type IN ('above', 'below')),
  threshold_value   real NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  notify_email      text NOT NULL DEFAULT '',
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end   text NOT NULL DEFAULT '07:00',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_home ON alert_rules(home_id);

CREATE TABLE IF NOT EXISTS alert_events (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id   uuid NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ts        timestamptz NOT NULL,
  metric    text NOT NULL,
  value     real NOT NULL,
  status    text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_alert_events_device ON alert_events(device_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_ts ON alert_events(ts DESC);
