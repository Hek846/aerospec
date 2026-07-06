# Sensair API

RESTful API backend for the Sensair air quality monitoring system.

## Overview

The Sensair API is built with Express and TypeScript, providing endpoints for:
- User authentication and authorization
- Home and room management
- Device monitoring and sensor data
- Alert configuration and events
- Weekly reports and analytics
- Admin fleet management

## Quick Start

```bash
# Install dependencies (from repo root)
pnpm install

# Start development server
pnpm dev:api

# Build for production
pnpm build:api

# Start production server
pnpm start:api
```

The API will be available at `http://localhost:4000`

## Architecture

### Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.x
- **Language**: TypeScript 5.x
- **Data**: In-memory JSON fixtures (no database)
- **Authentication**: Mock JWT (base64-encoded JSON)

### Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Application entry point
│   ├── auth/
│   │   └── middleware.ts     # Authentication & authorization
│   ├── data/
│   │   └── loader.ts         # JSON data loading utilities
│   ├── middleware/
│   │   └── errorHandler.ts  # Global error handling
│   └── routes/
│       ├── auth.ts           # Login endpoints
│       ├── homes.ts          # Home management
│       ├── rooms.ts          # Room data
│       ├── devices.ts        # Device monitoring
│       ├── alerts.ts         # Alert rules & events
│       ├── reports.ts        # Weekly reports
│       ├── admin.ts          # Admin endpoints
│       └── compare.ts        # Room comparison
├── Dockerfile
└── package.json
```

## Authentication

### Mock Authentication

The API uses mock JWT authentication for development. Tokens are base64-encoded JSON blobs containing user information:

```typescript
interface TokenPayload {
  userId: string;
  role: 'owner' | 'standard' | 'admin';
  email: string;
}
```

### Login Endpoint

**POST** `/auth/login`

Request:
```json
{
  "email": "sarah.johnson@example.com",
  "password": "any-password"
}
```

Response:
```json
{
  "token": "base64-encoded-json",
  "user": {
    "id": "user-owner-1",
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "role": "owner",
    "homes": ["home-lynnwood-1"]
  }
}
```

**Note**: Any password is accepted; only the email is validated against the user database.

### Test Accounts

| Email | Role | Access |
|-------|------|--------|
| `sarah.johnson@example.com` | Owner | Full home control |
| `mike.johnson@example.com` | Standard | View-only access |
| `admin@sensair.com` | Admin | Platform admin |

### Protected Endpoints

Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## API Endpoints

### Health Check

**GET** `/health`

Returns API health status.

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T10:30:00.000Z"
}
```

---

### Homes

**GET** `/homes`

List all homes accessible to the authenticated user.

Response:
```json
[
  {
    "id": "home-lynnwood-1",
    "ownerId": "user-owner-1",
    "name": "Lynnwood Home",
    "location": {
      "city": "Lynnwood",
      "region": "WA",
      "lat": 47.8209,
      "lon": -122.3151
    },
    "timezone": "America/Los_Angeles",
    "configProfileId": "profile-standard",
    "roomIds": ["room-br1", "room-br2", "..."]
  }
]
```

---

**GET** `/homes/:homeId/rooms`

Get all rooms in a home with latest AQI readings.

Response:
```json
{
  "home": { ... },
  "rooms": [
    {
      "room": { ... },
      "device": { ... },
      "latestReading": {
        "aqi": 45,
        "pm25": 8.2,
        "co2": 650,
        "...": "..."
      }
    }
  ]
}
```

---

### Rooms

**GET** `/rooms/:roomId`

Get room details with latest sensor reading.

Response:
```json
{
  "room": {
    "id": "room-br1",
    "homeId": "home-lynnwood-1",
    "name": "Bedroom 1",
    "type": "Bedroom",
    "floor": "2",
    "deviceId": "device-br1"
  },
  "device": { ... },
  "latestReading": { ... }
}
```

---

### Devices

**GET** `/devices`

List all devices accessible to the user.

Query parameters:
- `status` - Filter by status (online/offline)

Response:
```json
[
  {
    "id": "device-br1",
    "homeId": "home-lynnwood-1",
    "roomId": "room-br1",
    "name": "Bedroom 1 Monitor",
    "status": "online",
    "lastSeen": "2025-11-23T10:25:00.000Z",
    "firmwareVersion": "2.1.0",
    "wifiRssi": -45,
    "batteryLevel": null
  }
]
```

---

**GET** `/devices/:deviceId`

Get device details with latest reading.

Response:
```json
{
  "device": { ... },
  "room": { ... },
  "latestReading": { ... }
}
```

---

**GET** `/devices/:deviceId/readings`

Get historical sensor readings for a device.

Query parameters:
- `range` - Time range: `24h`, `7d`, `30d` (default: `24h`)
- `limit` - Maximum readings to return (default: unlimited)

Response:
```json
{
  "device": { ... },
  "range": "24h",
  "readings": [
    {
      "deviceId": "device-br1",
      "timestamp": "2025-11-23T10:00:00.000Z",
      "pm25": 8.2,
      "pm10": 14.5,
      "co2": 650,
      "temperature": 21.3,
      "humidity": 45.2,
      "pressure": 1015.3,
      "vocIndex": 150,
      "noiseDb": 32.1,
      "aqi": 34,
      "anomalyFlags": []
    }
  ]
}
```

---

### Compare Rooms

**GET** `/compare`

Compare sensor data across multiple rooms.

Query parameters:
- `roomIds` - Comma-separated room IDs (required, min 2, max 10)
- `range` - Time range: `24h`, `7d`, `30d` (default: `24h`)

Example: `/compare?roomIds=room-br1,room-br2,room-lr&range=7d`

Response:
```json
{
  "range": "7d",
  "rooms": [
    {
      "room": { ... },
      "device": { ... },
      "readings": [ ... ],
      "stats": {
        "pm25": { "avg": 8.5, "min": 5.2, "max": 15.3, "current": 8.2 },
        "co2": { "avg": 680, "min": 450, "max": 1200, "current": 650 },
        "...": "..."
      }
    }
  ],
  "comparisonSummary": {
    "bestAirQuality": { "roomId": "...", "roomName": "...", "avgAqi": 32 },
    "worstAirQuality": { "roomId": "...", "roomName": "...", "avgAqi": 78 },
    "highestPm25": { "roomId": "...", "avgPm25": 15.2 },
    "highestCo2": { "roomId": "...", "avgCo2": 850 }
  }
}
```

---

### Alerts

**GET** `/alerts`

Get all alert rules and recent events.

Response:
```json
{
  "rules": [ ... ],
  "events": [ ... ]
}
```

---

**POST** `/alerts/:alertId/ack`

Acknowledge an alert event.

Request:
```json
{
  "acknowledgedBy": "user-owner-1"
}
```

Response:
```json
{
  "success": true,
  "event": { "status": "acknowledged", "...": "..." }
}
```

---

### Reports

**GET** `/reports/weekly`

Get weekly air quality summary reports.

Response:
```json
[
  {
    "id": "report-week-46-2025",
    "homeId": "home-lynnwood-1",
    "weekStarting": "2025-11-17",
    "avgAqi": 42,
    "trend": "improving",
    "roomSummaries": [ ... ]
  }
]
```

---

### Admin Endpoints

**Requires admin role**

**GET** `/admin/devices`

Get fleet-wide device list with filtering.

Query parameters:
- `status` - Filter by status
- `deploymentId` - Filter by deployment
- `firmwareVersion` - Filter by firmware

Response:
```json
{
  "devices": [ ... ],
  "summary": {
    "total": 6,
    "online": 5,
    "offline": 1,
    "firmwareDistribution": { "2.1.0": 5, "2.0.5": 1 }
  }
}
```

---

**POST** `/admin/ota`

Initiate OTA firmware update (stub).

Request:
```json
{
  "deviceIds": ["device-br1", "device-br2"],
  "firmwareVersion": "2.2.0"
}
```

Response:
```json
{
  "jobId": "ota-job-12345",
  "status": "queued",
  "deviceCount": 2
}
```

## Role-Based Access Control

Endpoints enforce permissions based on user role:

| Endpoint Pattern | Owner | Standard | Admin |
|-----------------|:-----:|:--------:|:-----:|
| `/auth/*` | ✓ | ✓ | ✓ |
| `/health` | ✓ | ✓ | ✓ |
| `/homes` | ✓ | ✓ | ✓ |
| `/rooms/*` | ✓ | ✓ | ✓ |
| `/devices/*` (read) | ✓ | ✓ | ✓ |
| `/compare` | ✓ | ✓ | ✓ |
| `/alerts` (read) | ✓ | ✓ | ✓ |
| `/alerts` (write) | ✓ | ✗ | ✓ |
| `/reports` | ✓ | ✓ | ✓ |
| `/admin/*` | ✗ | ✗ | ✓ |

Unauthorized requests return `403 Forbidden`.

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

## Data Storage

### In-Memory Fixtures

Data is loaded from JSON files at startup:

```
packages/data/src/data/
├── users.json
├── homes.json
├── rooms.json
├── devices.json
├── sensorReadings.json
├── alertRules.json
├── alertEvents.json
├── configProfiles.json
└── reportSummaries.json
```

### Data Loader

The `data/loader.ts` module provides helper functions:

```typescript
import {
  getUserById,
  getHomeById,
  getRoomById,
  getDeviceById,
  getReadingsForDevice,
  getLatestReadingForDevice,
  getHomesForUser,
  getRoomsByHomeId
} from './data/loader.js';
```

## Development

### Adding a New Endpoint

1. Create route handler in `src/routes/`
2. Import and register in `src/index.ts`
3. Add authentication middleware if needed
4. Implement business logic
5. Return JSON response

Example:

```typescript
// src/routes/myroute.ts
import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';

const router: Router = express.Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  // Implementation
  res.json({ data: '...' });
});

export default router;
```

```typescript
// src/index.ts
import myRoute from './routes/myroute.js';
// ...
app.use('/myroute', myRoute);
```

### Testing

```bash
# Run tests
pnpm test

# Run linter
pnpm lint
```

## Deployment

### Docker

```bash
# Build image
docker build -t sensair-api -f apps/api/Dockerfile .

# Run container
docker run -p 4000:4000 --env-file .env sensair-api
```

### Environment Variables

```bash
NODE_ENV=production
PORT=4000
FRONTEND_URL=http://localhost:8080
JWT_SECRET=your-secret-key
```

## Future Enhancements

- Real database integration (PostgreSQL/MongoDB)
- Actual JWT signing and verification
- Rate limiting
- Request validation (Zod/Joi)
- API versioning
- WebSocket support for real-time updates
- Comprehensive test coverage
- API documentation (OpenAPI/Swagger)
