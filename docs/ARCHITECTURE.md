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
        ANA["Analytics routes<br/>score + trends"]
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
    API --- ANA
    ANA --> DB
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
    W->>A: GET /analytics/score?homeId=…
    A->>D: query hourly_device_stats
    A-->>W: daily score + breakdown
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

## 5. Analytics API

```mermaid
flowchart TB
    C["Web or mobile client"] -->|"Bearer JWT + homeId"| A["/analytics"]
    A --> G["Home membership guard"]
    G --> H[("hourly_device_stats")]
    G --> D[("devices")]
    G --> ANN[("annotations")]
    H --> S["Score library<br/>subscores + bands"]
    S --> ONE["/score<br/>daily home score"]
    S --> TWO["/trends<br/>bucketed points"]
    S --> THREE["/calendar<br/>month days"]
    S --> FOUR["/patterns<br/>hour + weekday/weekend"]
    ANN --> FIVE["/factors<br/>tag contrast vs baseline"]
    D --> FIVE
```

The analytics API is home-scoped and authenticated. It reads only
`hourly_device_stats` joined through `devices.home_id`, so it works against
both the TimescaleDB continuous aggregate and the plain Postgres view fallback.
The score library is pure TypeScript and computes metric subscores, missing
metric weight renormalization, and score bands.

## 6. Annotations API

```mermaid
flowchart TB
    C["Web or mobile client"] -->|"Bearer JWT"| A["/annotations"]
    A --> G["Home membership guard"]
    G --> ANN[("annotations")]
    A --> M["camelCase mapper"]
    ANN --> M
    M --> R["{ annotation }<br/>{ annotations, total }"]
```

Annotations are timestamped, tagged events scoped to a home (and optionally a
room or device). They support the `FACTOR_TAGS` vocabulary defined in
`packages/types` and are used by `/analytics/factors` to contrast PM2.5 during
tagged windows against a same-hours baseline. Updates and deletes are restricted
to the annotation creator or the home's `owner`.

## 7. Device onboarding workflow

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

## 8. Map & crowd-sourced data privacy

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

### Device vs neighborhood vs city comparison

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Express API
    participant D as TimescaleDB
    participant P as OpenAQ proxy
    participant O as OpenAQ v3

    C->>A: GET /compare/context?deviceId=&hours=
    A->>D: avg(coalesce(pm25_corr, pm25_env)), avg(aqi) for device
    A->>D: per-home aggregates in same H3 res-7 cell
    A->>A: merge homes into target H3 cell
    alt OPENAQ_API_KEY set
        A->>P: stations in ~25 km bbox
        P->>O: /locations?bbox=&parameters_id=2
        P-->>A: stations { pm25, aqi }
    end
    A-->>C: { device, neighborhood, city, hours }
```

`GET /compare/context` composes three independent sources into a single
three-way comparison:

1. **Device** — average PM2.5/AQI from the device's own readings over the
   requested window.
2. **Neighborhood** — H3 resolution-7 cell that contains the device's home,
   aggregating all AeroSpec devices whose home falls in that cell.
3. **City** — mean of nearby OpenAQ stations within a ~25 km bbox, served by
   the same cached proxy used for the map. This block is best-effort and
   returns `null` when the key is missing, no stations report PM2.5, or the
   upstream call fails.

## 9. Deployment

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

## 10. Repository layout

| Path | What lives here |
|---|---|
| `apps/api` | Express + TypeScript API, DB migrations/seed, AQI lib |
| `apps/web` | React + Vite dashboard, MapLibre map |
| `apps/mobile` | Flutter app: BLE stack, sync state machine, dashboards |
| `packages/types` | Shared TypeScript types |
| `packages/data` | Demo data generators |
| `docs/` | This file + `PIPELINE.md` contract |
| `infra/` | Deployment helpers |
