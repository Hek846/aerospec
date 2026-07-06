# AeroSpec Data Pipeline Contract

This document is the source of truth for how data flows through the system and
what every component must implement. Phase 1 scope: real end-to-end pipeline.

```
Boron sensor --BLE (NUS)--> Flutter app (foreground sync) --HTTPS--> API (Express)
                                                                       |
                                                          Postgres + TimescaleDB
                                                                       |
                                              Web dashboard / Mobile app / Map
                                                       (OpenAQ overlay for outdoor reference)
```

## 1. Device -> Phone (BLE)

Implemented by firmware already (see `AeroSpec-Firmware/README.md`). Summary:

- Advertised name: `AeroSpec`. Nordic UART Service:
  - Service `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
  - RX (phone->device, write): `6E400002-...`
  - TX (device->phone, notify): `6E400003-...`
- ASCII lines terminated by `\n`, notifications chunked to 20 bytes — the app
  must reassemble until newline.
- Commands the app uses in phase 1: `PING`, `GET INFO`, `GET LIVE`,
  `GET HISTORY`, `SET TIME <unix>`, `SET INTERVAL <s>`, `STOP`.
- Live sample push: `$D,<csv>` every interval while connected.
- History transfer: `GET HISTORY` -> `$H,BEGIN,<bytes>` -> `$H,<csv line>`*
  -> `$H,END,<count>`.

CSV record (19 columns, `NA` = missing, timestamps UTC):

```
Date(YYYY-MM-DD), Time(HH:MM:SS), Battery(V), Temp_C, RH_pct, Press_hPa,
Dp>0.3, Dp>0.5, Dp>1.0, Dp>2.5, Dp>5.0, Dp>10.0,
PM1_Std, PM2.5_Std, PM10_Std, PM1_Env, PM2.5_Env, PM10_Env, PM2.5_Corr
```

`Dp>x` = particle counts per 0.1 L. `PM2.5_Corr` = EPA humidity-corrected
PM2.5 (preferred value for AQI).

## 2. Phone -> Backend (ingestion)

The logged-in app uploads readings on behalf of a claimed device.

`POST /ingest/readings` (Bearer user JWT)

```json
{
  "deviceId": "uuid-of-claimed-device",
  "source": "ble",
  "readings": [
    {
      "ts": "2026-07-06T21:04:30Z",
      "batteryV": 3.98,
      "temperature": 22.4,
      "humidity": 41.2,
      "pressure": 1012.6,
      "bins": [1234, 400, 80, 12, 3, 1],
      "pm1Std": 4.0, "pm25Std": 6.1, "pm10Std": 7.2,
      "pm1Env": 4.0, "pm25Env": 6.1, "pm10Env": 7.2,
      "pm25Corr": 5.8
    }
  ]
}
```

- Max 500 readings per request; app batches long history transfers.
- Any numeric field may be `null` (firmware `NA`).
- Response: `{ "inserted": n, "duplicates": n }`. Duplicates (same
  `device_id`+`ts`) are silently skipped, so re-uploading overlapping history
  is safe — the app does NOT need exact bookkeeping, but should keep a local
  high-water mark to avoid resending everything.
- Server computes AQI from `pm25Corr` (fallback `pm25Env`) using US EPA
  PM2.5 breakpoints, and updates the device's `last_seen` / battery.

## 3. Backend data model (Postgres + TimescaleDB)

- `users` — id, email (unique), password_hash (bcrypt), name,
  role (`user` | `admin`).
- `homes` — id, name, lat, lon, city, region, timezone.
- `home_members` — home_id, user_id, role (`owner` | `member`).
- `rooms` — id, home_id, name, type, floor.
- `devices` — id, serial (unique, printed on device / user-entered),
  name, home_id, room_id, firmware_version, last_seen, battery_pct.
- `sensor_readings` — TimescaleDB hypertable, PK `(device_id, ts)`. Columns
  mirror the ingest payload plus computed `aqi`. Nullable `co2`, `voc_index`,
  `noise_db` reserved for future hardware.
- `alert_rules`, `alert_events` — same semantics as the old JSON fixtures.

## 4. Backend HTTP API

All JSON, Bearer JWT except register/login/health. Existing route shapes are
preserved so the web frontend keeps working; new routes marked (new).

| Route | Notes |
|---|---|
| `POST /auth/register` (new) | name, email, password -> token + user |
| `POST /auth/login` | now verifies bcrypt password |
| `GET /auth/me` | decoded user |
| `GET /homes` / `POST /homes` (new) | homes for user / create home |
| `GET /homes/:id/rooms` / `POST /homes/:id/rooms` (new) | rooms + latest AQI |
| `GET /devices` (new) | user's devices with latest reading |
| `POST /devices/claim` (new) | serial, name, homeId, roomId? |
| `GET /devices/:id/readings?range=24h\|7d\|30d` | time-bucketed via TimescaleDB |
| `GET /devices/:id/export`, `GET /homes/:id/export` | CSV/JSON |
| `POST /ingest/readings` (new) | see section 2 |
| `GET /map/cells?bbox=&hours=` (new) | privacy-fuzzed grid aggregation |
| `GET /external/openaq/latest?bbox=` (new) | OpenAQ v3 proxy w/ cache |
| `/alerts`, `/reports`, `/compare`, `/admin` | same shapes, DB-backed |

### Privacy fuzzing (`/map/cells`)

Device locations are NEVER returned individually. Readings are aggregated
into ~1.1 km grid cells (lat/lon rounded to 0.01°); each cell returns center
coordinates, device count, avg PM2.5 / AQI over the window. Cells with data
from fewer than 1 device are still shown but never expose the serial or exact
coordinates.

### OpenAQ proxy

`GET /external/openaq/latest?bbox=minLon,minLat,maxLon,maxLat` proxies OpenAQ
v3 (`https://api.openaq.org/v3/locations?bbox=...&parameters_id=2`), attaches
`X-API-Key` from env `OPENAQ_API_KEY` (works unauthenticated with low rate
limits), caches responses in memory for 10 minutes, and normalizes to
`[{ id, name, lat, lon, pm25, aqi, lastUpdated }]`.

## 5. Environment

```
DATABASE_URL=postgres://aerospec:aerospec@db:5432/aerospec
JWT_SECRET=<random>
OPENAQ_API_KEY=<optional>
PORT=4000
FRONTEND_URL=http://localhost:8080
```

`docker compose up` starts db (timescale/timescaledb), api (runs migrations on
boot), web (nginx). `pnpm db:seed` creates the demo admin
(`admin@aerospec.io` / `aerospec-admin`) and a demo home with simulated data.

## 6. Mobile sync flow (foreground)

1. User logs in (JWT stored in secure storage).
2. Device claim: scan BLE for `AeroSpec`, connect, `GET INFO` to read firmware
   + status, user enters/confirms serial, `POST /devices/claim`.
3. Every time the app is opened with the device in range:
   `connect -> GET INFO` (if clock unset: `SET TIME <now>`) `-> GET HISTORY`,
   parse lines newer than the local high-water mark, batch-upload via
   `/ingest/readings`, update high-water mark, then stay subscribed to `$D`
   live samples (display + upload periodically).
4. Sync must survive partial failure: server-side dedupe makes retries safe.
