import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import {
  getDeviceRowById,
  getUserHomeIds,
  userHasHomeAccess,
  mapDevice,
  mapReading,
  parseRange,
  getReadingsForRange,
  getRawReadingsForRange,
  DeviceRow,
  ReadingRow
} from '../db/queries.js';

const router: Router = express.Router();

interface DeviceListRow extends DeviceRow {
  room_name: string | null;
  home_name: string | null;
}

// GET /devices - All devices visible to the user, with latest reading
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const pool = getPool();
    const isAdmin = req.user!.role === 'admin';

    const result = isAdmin
      ? await pool.query<DeviceListRow>(
          `SELECT d.id, d.serial, d.name, d.home_id, d.room_id, d.firmware_version,
                  d.last_seen, d.battery_pct, r.name AS room_name, h.name AS home_name
             FROM devices d
             LEFT JOIN rooms r ON r.id = d.room_id
             LEFT JOIN homes h ON h.id = d.home_id
            ORDER BY d.created_at`
        )
      : await pool.query<DeviceListRow>(
          `SELECT d.id, d.serial, d.name, d.home_id, d.room_id, d.firmware_version,
                  d.last_seen, d.battery_pct, r.name AS room_name, h.name AS home_name
             FROM devices d
             LEFT JOIN rooms r ON r.id = d.room_id
             LEFT JOIN homes h ON h.id = d.home_id
            WHERE d.home_id IN (SELECT home_id FROM home_members WHERE user_id = $1)
            ORDER BY d.created_at`,
          [req.user!.userId]
        );

    const devices = await Promise.all(
      result.rows.map(async (row) => {
        const latestResult = await pool.query<ReadingRow>(
          'SELECT * FROM sensor_readings WHERE device_id = $1 ORDER BY ts DESC LIMIT 1',
          [row.id]
        );
        const latestRow = latestResult.rows[0];
        return {
          ...mapDevice(row),
          roomName: row.room_name,
          homeName: row.home_name,
          latestReading: latestRow ? mapReading(latestRow) : null
        };
      })
    );

    res.json({ devices, total: devices.length });
  })
);

// POST /devices/claim - Create or claim an unclaimed device by serial
router.post(
  '/claim',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { serial, name, homeId, roomId } = req.body as {
      serial?: unknown;
      name?: unknown;
      homeId?: unknown;
      roomId?: unknown;
    };

    if (typeof serial !== 'string' || serial.trim().length === 0) {
      throw new AppError('serial is required', 400);
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('name is required', 400);
    }
    if (typeof homeId !== 'string' || homeId.length === 0) {
      throw new AppError('homeId is required', 400);
    }
    if (roomId !== undefined && roomId !== null && typeof roomId !== 'string') {
      throw new AppError('roomId must be a string', 400);
    }

    if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
      throw new AppError('Access denied to this home', 403);
    }

    const pool = getPool();

    if (roomId) {
      const roomCheck = await pool.query('SELECT 1 FROM rooms WHERE id = $1 AND home_id = $2', [
        roomId,
        homeId
      ]);
      if ((roomCheck.rowCount ?? 0) === 0) {
        throw new AppError('Room not found in this home', 404);
      }
    }

    const normalizedSerial = serial.trim();
    const existing = await pool.query<DeviceRow>(
      `SELECT id, serial, name, home_id, room_id, firmware_version, last_seen, battery_pct
         FROM devices WHERE serial = $1`,
      [normalizedSerial]
    );

    let deviceRow: DeviceRow;
    const existingRow = existing.rows[0];

    if (existingRow) {
      if (existingRow.home_id && existingRow.home_id !== homeId) {
        throw new AppError('Device is already claimed by another home', 409);
      }
      const updated = await pool.query<DeviceRow>(
        `UPDATE devices SET name = $2, home_id = $3, room_id = $4
          WHERE id = $1
          RETURNING id, serial, name, home_id, room_id, firmware_version, last_seen, battery_pct`,
        [existingRow.id, name.trim(), homeId, roomId ?? null]
      );
      deviceRow = updated.rows[0]!;
    } else {
      const inserted = await pool.query<DeviceRow>(
        `INSERT INTO devices (serial, name, home_id, room_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, serial, name, home_id, room_id, firmware_version, last_seen, battery_pct`,
        [normalizedSerial, name.trim(), homeId, roomId ?? null]
      );
      deviceRow = inserted.rows[0]!;
    }

    res.status(201).json({ device: mapDevice(deviceRow) });
  })
);

async function requireDeviceAccess(req: AuthRequest, deviceId: string): Promise<DeviceRow> {
  const device = await getDeviceRowById(deviceId);
  if (!device) {
    throw new AppError('Device not found', 404);
  }
  if (req.user!.role !== 'admin') {
    const homeIds = await getUserHomeIds(req.user!.userId);
    if (!device.home_id || !homeIds.includes(device.home_id)) {
      throw new AppError('Access denied to this device', 403);
    }
  }
  return device;
}

// GET /devices/:deviceId/readings?range=24h|7d|30d&page=1&limit=1000
router.get(
  '/:deviceId/readings',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const range = parseRange(req.query.range);

    await requireDeviceAccess(req, deviceId);

    const pageNum = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limitNum = Math.min(
      1000,
      Math.max(1, parseInt(String(req.query.limit ?? '1000'), 10) || 1000)
    );
    const offset = (pageNum - 1) * limitNum;

    // Downsampled sets are <= ~500 points, so in-memory pagination is cheap.
    const readings = await getReadingsForRange(deviceId, range);
    const paginated = readings.slice(offset, offset + limitNum);
    const totalPages = Math.max(1, Math.ceil(readings.length / limitNum));

    res.json({
      deviceId,
      range,
      readings: paginated,
      pagination: {
        total: readings.length,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  })
);

// GET /devices/:deviceId/export?range=24h|7d|30d&format=csv|json
router.get(
  '/:deviceId/export',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const range = parseRange(req.query.range);
    const format = req.query.format === 'csv' ? 'csv' : 'json';

    const device = await requireDeviceAccess(req, deviceId);
    const readings = await getRawReadingsForRange(deviceId, range);

    if (format === 'csv') {
      const headers = [
        'timestamp',
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
        ...readings.map((reading) =>
          headers.map((header) => String(reading[header] ?? '')).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="device-${deviceId}-${range}.csv"`
      );
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="device-${deviceId}-${range}.json"`
      );
      res.json({
        device: {
          id: device.id,
          name: device.name,
          deploymentId: device.serial
        },
        exportDate: new Date().toISOString(),
        range,
        totalReadings: readings.length,
        readings
      });
    }
  })
);

export default router;
