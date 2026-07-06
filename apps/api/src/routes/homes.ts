import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import {
  getHomesForUser,
  getHomeById,
  getRoomsByHomeId,
  getLatestReading,
  userHasHomeAccess,
  deviceStatus,
  parseRange,
  getRawReadingsForRange,
  DeviceRow,
  ApiReading
} from '../db/queries.js';

const router: Router = express.Router();

// GET /homes - List homes accessible to user
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const userHomes = await getHomesForUser(req.user!.userId);
    res.json({
      homes: userHomes,
      total: userHomes.length
    });
  })
);

// POST /homes - Create a home; creator becomes owner
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, lat, lon, city, region, timezone } = req.body as {
      name?: unknown;
      lat?: unknown;
      lon?: unknown;
      city?: unknown;
      region?: unknown;
      timezone?: unknown;
    };

    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Home name is required', 400);
    }

    const pool = getPool();
    const client = await pool.connect();
    let homeId: string;
    try {
      await client.query('BEGIN');
      const homeResult = await client.query<{ id: string }>(
        `INSERT INTO homes (name, lat, lon, city, region, timezone)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          name.trim(),
          typeof lat === 'number' ? lat : null,
          typeof lon === 'number' ? lon : null,
          typeof city === 'string' ? city : null,
          typeof region === 'string' ? region : null,
          typeof timezone === 'string' && timezone.length > 0 ? timezone : 'UTC'
        ]
      );
      homeId = homeResult.rows[0]!.id;
      await client.query(
        `INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [homeId, req.user!.userId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const home = await getHomeById(homeId);
    res.status(201).json({ home });
  })
);

// GET /homes/:homeId/rooms - Rooms + latest AQI per room
router.get(
  '/:homeId/rooms',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { homeId } = req.params;

    if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
      throw new AppError('Access denied to this home', 403);
    }

    const rooms = await getRoomsByHomeId(homeId);

    const roomsWithAQI = await Promise.all(
      rooms.map(async (room) => {
        let latestAQI: number | null = null;
        let latestTimestamp: string | null = null;
        let status: 'online' | 'offline' = 'offline';

        if (room.deviceId) {
          const [latest, deviceResult] = await Promise.all([
            getLatestReading(room.deviceId),
            getPool().query<Pick<DeviceRow, 'last_seen'>>(
              'SELECT last_seen FROM devices WHERE id = $1',
              [room.deviceId]
            )
          ]);
          latestAQI = latest?.aqi ?? null;
          latestTimestamp = latest?.timestamp ?? null;
          status = deviceStatus(deviceResult.rows[0]?.last_seen ?? null);
        }

        return {
          ...room,
          latestAQI,
          latestTimestamp,
          deviceStatus: status
        };
      })
    );

    res.json({
      homeId,
      rooms: roomsWithAQI,
      total: roomsWithAQI.length
    });
  })
);

// POST /homes/:homeId/rooms - Create a room
router.post(
  '/:homeId/rooms',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { homeId } = req.params;
    const { name, type, floor } = req.body as {
      name?: unknown;
      type?: unknown;
      floor?: unknown;
    };

    if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
      throw new AppError('Access denied to this home', 403);
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Room name is required', 400);
    }

    const result = await getPool().query<{ id: string }>(
      `INSERT INTO rooms (home_id, name, type, floor) VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        homeId,
        name.trim(),
        typeof type === 'string' && type.length > 0 ? type : 'Other',
        floor !== undefined && floor !== null ? String(floor) : '1'
      ]
    );

    res.status(201).json({
      room: {
        id: result.rows[0]!.id,
        homeId,
        name: name.trim(),
        type: typeof type === 'string' && type.length > 0 ? type : 'Other',
        floor: floor !== undefined && floor !== null ? String(floor) : '1',
        deviceId: ''
      }
    });
  })
);

// GET /homes/:homeId/export?range=24h|7d|30d&format=csv|json
router.get(
  '/:homeId/export',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { homeId } = req.params;
    const range = parseRange(req.query.range);
    const format = req.query.format === 'csv' ? 'csv' : 'json';

    if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
      throw new AppError('Access denied to this home', 403);
    }

    const home = await getHomeById(homeId);
    if (!home) {
      throw new AppError('Home not found', 404);
    }

    const devicesResult = await getPool().query<{
      id: string;
      name: string;
      room_name: string | null;
    }>(
      `SELECT d.id, d.name, r.name AS room_name
         FROM devices d
         LEFT JOIN rooms r ON r.id = d.room_id
        WHERE d.home_id = $1
        ORDER BY d.created_at`,
      [homeId]
    );

    type ExportReading = ApiReading & { deviceName: string; roomName: string };
    const allReadings: ExportReading[] = [];
    for (const device of devicesResult.rows) {
      const readings = await getRawReadingsForRange(device.id, range);
      for (const reading of readings) {
        allReadings.push({
          ...reading,
          deviceName: device.name,
          roomName: device.room_name ?? 'Unknown'
        });
      }
    }

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'deviceName',
        'roomName',
        'pm25',
        'pm10',
        'co2',
        'temperature',
        'humidity',
        'pressure',
        'vocIndex',
        'noiseDb',
        'aqi'
      ] as const;

      const csvRows = [
        headers.join(','),
        ...allReadings.map((reading) =>
          headers
            .map((header) => {
              const value = reading[header];
              return typeof value === 'string' && value.includes(',')
                ? `"${value}"`
                : String(value ?? '');
            })
            .join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="home-${homeId}-${range}.csv"`
      );
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="home-${homeId}-${range}.json"`
      );
      res.json({
        home: {
          id: home.id,
          name: home.name,
          location: home.location
        },
        exportDate: new Date().toISOString(),
        range,
        totalDevices: devicesResult.rows.length,
        totalReadings: allReadings.length,
        readings: allReadings
      });
    }
  })
);

export default router;
