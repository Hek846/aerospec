# AeroSpec Architecture

> **Maintenance policy**: this document is the living map of the system.
> Any PR that changes the architecture, API surface, database schema, BLE
> protocol, or deployment topology must update the affected diagram(s) in
> the same PR. Diagrams are [Mermaid](https://mermaid.js.org/) and render
> natively on GitHub.

Companion documents:

- [`README.md`](./README.md) — documentation index (living vs historical)
- [`PIPELINE.md`](./PIPELINE.md) — binding API/data contract between firmware, mobile, API, and web
- [`../AGENTS.md`](../AGENTS.md) — conventions for all agents (Mermaid-first docs)
- Firmware BLE protocol — `AeroSpec-Firmware` repository README

## 1. System overview

```mermaid
flowchart LR
    subgraph Field["Sensor (Particle Boron)"]
        FW["AeroSpec firmware<br/>PMSA003 + BME280"]
    end

    subgraph Phone["Phone (Flutter app)"]
        BLE["BLE stack<br/>Nordic UART Service"]
        SYNC["SyncNotifier<br/>history + live sync"]
        UI_M["Mobile dashboards"]
    end

    subgraph Cloud["Backend (Docker Compose)"]
        API["Express API<br/>JWT auth"]
        DB[("Postgres<br/>TimescaleDB")]
        PROXY["OpenAQ proxy<br/>10 min cache"]
    end

    subgraph Browser["Browser"]
        WEB["React dashboard<br/>MapLibre regional map"]
    end

    OAQ["OpenAQ v3 API<br/>(public stations)"]

    FW -- "BLE ASCII lines<br/>$D live / $H history" --> BLE
    BLE --> SYNC
    SYNC -- "POST /ingest/readings<br/>(batched, deduped)" --> API
    SYNC --> UI_M
    UI_M -- "REST + JWT" --> API
    API <--> DB
    WEB -- "REST + JWT" --> API
    PROXY --> OAQ
    API --- PROXY
```

Key property: **the sensor never talks to the cloud directly**. It logs to
its SD card and serves data over BLE; the phone is the gateway that uploads
to the API. Cellular on the Boron is used only for clock sync.

## 2. End-to-end data flow

```mermaid
sequenceDiagram
    autonumber
    participant S as Boron sensor
    participant M as Flutter app
    participant A as API
    participant D as TimescaleDB
    participant W as Web dashboard

    Note over M: user taps "Sync" (foreground)
    M->>S: BLE scan + connect (NUS)
    M->>S: GET HISTORY <high-water mark>
    loop history transfer
        S-->>M: $H CSV sample lines
        M->>A: POST /ingest/readings (batch ≤500, JWT)
        A->>D: INSERT ... ON CONFLICT DO NOTHING
        A-->>M: { inserted, duplicates }
    end
    S-->>M: $H DONE
    Note over M: phase = live
    loop while connected
        S-->>M: $D live sample (10 s)
        M->>A: POST /ingest/readings (periodic flush)
    end
    Note over M: store new high-water mark

    W->>A: GET /devices (JWT)
    A->>D: latest reading per device
    A-->>W: devices + latestReading + AQI
    W->>A: GET /map/cells?bbox=…
    A->>D: per-home aggregate query
    A-->>W: H3 cells (no serials, no exact coords)
```

Idempotency: readings are keyed `(device_id, ts)`; re-uploading overlapping
history is safe. The phone keeps a per-device *high-water mark* (newest
uploaded timestamp) so reconnects only transfer the gap.

## 3. Mobile sync state machine

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> scanning: user starts sync
    scanning --> connecting: device found
    scanning --> error: timeout
    connecting --> syncing: NUS subscribed
    connecting --> error: connect failed
    syncing --> live: $H DONE received
    syncing --> error: transfer aborted
    live --> idle: user stops / disconnect
    error --> scanning: retry
```

`syncing` = history transfer + batched upload with progress reporting;
`live` = `$D` samples streamed to the UI and uploaded periodically.

## 4. Database schema

```mermaid
erDiagram
    users ||--o{ home_members : "joins"
    homes ||--o{ home_members : "has"
    homes ||--o{ rooms : "contains"
    homes ||--o{ devices : "claims"
    rooms |o--o{ devices : "hosts"
    devices ||--o{ sensor_readings : "reports"
    homes ||--o{ annotations : "has"
    rooms |o--o{ annotations : "tags"
    devices |o--o{ annotations : "tags"
    users ||--o{ annotations : "writes"
    devices ||--o{ hourly_device_stats : "aggregates"
    homes ||--o{ alert_rules : "scopes"
    devices ||--o{ alert_rules : "scopes"
    alert_rules ||--o{ alert_events : "fires"
    devices ||--o{ alert_events : "on"

    users {
        uuid id PK
        text email UK
        text password_hash
        text role "user | admin"
    }
    homes {
        uuid id PK
        text name
        double lat
        double lon
        text timezone
    }
    home_members {
        uuid home_id PK,FK
        uuid user_id PK,FK
        text role "owner | member"
    }
    rooms {
        uuid id PK
        uuid home_id FK
        text name
        text type
    }
    devices {
        uuid id PK
        text serial UK "printed on unit"
        uuid home_id FK "null = unclaimed"
        uuid room_id FK
        timestamptz last_seen
        real battery_pct
    }
    sensor_readings {
        uuid device_id PK,FK
        timestamptz ts PK
        real pm25_env
        real pm25_corr "humidity-corrected"
        real pm10_env
        real temperature
        real humidity
        real pressure
        jsonb bins "particle size bins"
        real aqi "EPA PM2.5 AQI"
    }
    annotations {
        uuid id PK
        uuid home_id FK
        uuid room_id FK "nullable"
        uuid device_id FK "nullable"
        uuid user_id FK
        timestamptz ts
        text[] tags
        text note
        timestamptz created_at
    }
    hourly_device_stats {
        uuid device_id FK
        timestamptz hour
        double avg_pm25
        double avg_pm10
        double avg_co2
        double avg_voc_index
        double avg_humidity
        double avg_aqi
        bigint reading_count
    }
    alert_rules {
        uuid id PK
        uuid home_id FK
        uuid device_id FK
        text metric
        real threshold_value
    }
    alert_events {
        uuid id PK
        uuid rule_id FK
        uuid device_id FK
        timestamptz ts
        text status "open | acknowledged | closed"
    }
```

`sensor_readings` is a TimescaleDB hypertable when the extension is present
(plain-Postgres fallback works). Range queries downsample server-side: raw
for 24 h, 30-minute buckets for 7 d, 2-hour buckets for 30 d.

`hourly_device_stats` is exposed as a TimescaleDB continuous aggregate when
available, with a plain-Postgres view fallback of the same name and columns.

## 5. Device onboarding workflow

```mermaid
flowchart TD
    A["User opens app<br/>Profile → Connect Device"] --> B["BLE scan for<br/>AeroSpec devices"]
    B --> C["Connect + read serial<br/>from device"]
    C --> D{"Serial already<br/>claimed?"}
    D -- "no" --> E["POST /devices/claim<br/>{serial, name, homeId}"]
    D -- "claimed by my home" --> F["Re-link locally"]
    D -- "claimed elsewhere" --> G["409 — show error"]
    E --> H["Store serial → deviceId<br/>in local link store"]
    F --> H
    H --> I["Start history sync<br/>(section 3)"]
```

## 6. Map & crowd-sourced data privacy

```mermaid
flowchart LR
    R[("sensor_readings<br/>+ home lat/lon")] --> HOME["Aggregate per home<br/>inside API"]
    HOME --> AGG["Merge into H3 cells<br/>res 5-9"]
    AGG --> CELLS["GET /map/cells<br/>{h3, boundary, center,<br/>deviceCount, avgPm25, avgAqi}"]
    OAQ["OpenAQ v3"] --> P["Proxy: pm25 stations,<br/>active within 7 days,<br/>per-station /latest,<br/>10 min cache"]
    P --> ST["GET /external/openaq/latest<br/>{name, lat, lon, pm25, aqi}"]
    CELLS --> MAP["MapLibre map<br/>filled dot = AeroSpec cell<br/>ring = OpenAQ station"]
    ST --> MAP
```

User-owned home locations are **never exposed individually**: readings are
aggregated by home inside the API, then merged into H3 hex cells before any
map response is returned. Public map detail is clamped to H3 resolutions 5-9;
resolution 8 averages roughly 0.7 km² per hex, and resolution 9 is the
maximum-detail cap. Serials, device coordinates, and exact home coordinates
stay server-side. OpenAQ requires an API key (`OPENAQ_API_KEY` in `.env`).

## 7. Deployment

```mermaid
flowchart TB
    subgraph Host["Docker host (dev: NAS 192.168.68.101)"]
        direction LR
        WEB2["web<br/>nginx :8080<br/>serves built React app"]
        API2["api<br/>node :4000<br/>migrates + seeds on boot"]
        DB2[("db<br/>timescaledb :5432<br/>named volume")]
        WEB2 -. "browser calls API directly" .- API2
        API2 --> DB2
    end
    U["Browser / mobile app"] --> WEB2
    U --> API2
    API2 --> OAQ2["api.openaq.org"]
```

Single `docker compose up -d --build` brings up all three services; the API
runs migrations and (when `SEED_ON_BOOT=true` and the DB is empty) seeds
demo data on startup. `VITE_API_URL` is baked into the web build — set it to
the externally reachable API URL before building.

## 8. Repository layout

| Path | What lives here |
|---|---|
| `apps/api` | Express + TypeScript API, DB migrations/seed, AQI lib |
| `apps/web` | React + Vite dashboard, MapLibre map |
| `apps/mobile` | Flutter app: BLE stack, sync state machine, dashboards |
| `packages/types` | Shared TypeScript types |
| `packages/data` | Demo data generators |
| `docs/` | This file + `PIPELINE.md` contract |
| `infra/` | Deployment helpers |
