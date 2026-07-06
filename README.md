# AeroSpec

Consolidated monorepo for the AeroSpec air quality platform: a Particle
Boron-based particulate matter sensor, a phone app that syncs the sensor's
data over BLE and uploads it to the cloud, and a web dashboard with a
crowd-sourced regional air quality map.

```
Boron sensor --BLE--> Flutter app --HTTPS--> API --> TimescaleDB
                                              |
                          Web dashboard + regional map (OpenAQ overlay)
```

## Layout

| Path | Description |
|---|---|
| `apps/api` | Express + TypeScript backend (Postgres/TimescaleDB, JWT auth, ingestion, OpenAQ proxy) |
| `apps/web` | React + Vite web dashboard |
| `apps/mobile` | Flutter app (iOS-first): BLE device sync + dashboards |
| `packages/types` | Shared TypeScript types |
| `packages/data` | Demo data generators (seeding) |
| `docs/PIPELINE.md` | End-to-end data pipeline contract — read this first |

The firmware lives in the separate `AeroSpec-Firmware` repository; its README
documents the BLE protocol this repo implements against.

## Quick start (backend + web)

```bash
cp .env.example .env        # adjust JWT_SECRET etc.
docker compose up -d --build
# web:  http://localhost:8080   (demo login: admin@aerospec.io / aerospec-admin)
# api:  http://localhost:4000/health
```

Local development without Docker:

```bash
pnpm install
docker compose up -d db     # just the database
pnpm db:migrate && pnpm db:seed
pnpm dev:api                # http://localhost:4000
pnpm dev                    # http://localhost:5173
```

## Mobile

```bash
cd apps/mobile
flutter pub get
flutter run                 # requires a real device for BLE
```

## History

Consolidated in July 2026 from three earlier repositories: `sensair` (web
dashboard + API), `sensair-app` (modern Flutter app), and `App/flutter_aerospec`
(legacy Flutter app whose field-tested BLE stack was ported here).
