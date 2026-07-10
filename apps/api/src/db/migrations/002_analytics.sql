-- Analytics schema (see docs/PIPELINE.md section 3)

CREATE TABLE IF NOT EXISTS annotations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id    uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  room_id    uuid REFERENCES rooms(id) ON DELETE SET NULL,
  device_id  uuid REFERENCES devices(id) ON DELETE SET NULL,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ts         timestamptz NOT NULL,
  tags       text[] NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annotations_home_ts ON annotations(home_id, ts DESC);

-- Prefer a TimescaleDB continuous aggregate, but expose the same relation name
-- as a regular view when TimescaleDB is unavailable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'hourly_device_stats'
  ) THEN
    RETURN;
  END IF;

  BEGIN
    CREATE MATERIALIZED VIEW hourly_device_stats
    WITH (timescaledb.continuous) AS
      SELECT device_id,
             time_bucket(INTERVAL '1 hour', ts) AS hour,
             avg(coalesce(pm25_corr, pm25_env)) AS avg_pm25,
             avg(pm10_env) AS avg_pm10,
             avg(co2) AS avg_co2,
             avg(voc_index) AS avg_voc_index,
             avg(humidity) AS avg_humidity,
             avg(aqi) AS avg_aqi,
             count(*) AS reading_count
        FROM sensor_readings
       GROUP BY device_id, time_bucket(INTERVAL '1 hour', ts)
    WITH NO DATA;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'continuous aggregate hourly_device_stats skipped (TimescaleDB not available), creating plain Postgres view';

    CREATE VIEW hourly_device_stats AS
      SELECT device_id,
             date_trunc('hour', ts) AS hour,
             avg(coalesce(pm25_corr, pm25_env)) AS avg_pm25,
             avg(pm10_env) AS avg_pm10,
             avg(co2) AS avg_co2,
             avg(voc_index) AS avg_voc_index,
             avg(humidity) AS avg_humidity,
             avg(aqi) AS avg_aqi,
             count(*) AS reading_count
        FROM sensor_readings
       GROUP BY device_id, date_trunc('hour', ts);
  END;
END
$$;
