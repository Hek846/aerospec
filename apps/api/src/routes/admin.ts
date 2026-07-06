import express, { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth/middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import { mapDevice, DeviceRow, ONLINE_WINDOW_MINUTES } from '../db/queries.js';

const router: Router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /admin/devices - Fleet-wide device list
router.get(
  '/devices',
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await getPool().query<DeviceRow>(
      `SELECT id, serial, name, home_id, room_id, firmware_version, last_seen, battery_pct
         FROM devices ORDER BY created_at`
    );

    const devices = result.rows.map(mapDevice);
    const online = devices.filter((d) => d.status === 'online').length;

    res.json({
      total: devices.length,
      online,
      offline: devices.length - online,
      devices
    });
  })
);

// GET /admin/stats - System-wide statistics
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res) => {
    const pool = getPool();

    const [deviceStats, firmware, counts] = await Promise.all([
      pool.query<{
        total: string;
        online: string;
        avg_battery: number | null;
      }>(
        `SELECT count(*) AS total,
                count(*) FILTER (
                  WHERE last_seen >= now() - make_interval(mins => $1)
                ) AS online,
                avg(battery_pct)::real AS avg_battery
           FROM devices`,
        [ONLINE_WINDOW_MINUTES]
      ),
      pool.query<{ firmware_version: string | null; count: string }>(
        `SELECT firmware_version, count(*) AS count
           FROM devices GROUP BY firmware_version`
      ),
      pool.query<{ users: string; homes: string; readings: string }>(
        `SELECT (SELECT count(*) FROM users) AS users,
                (SELECT count(*) FROM homes) AS homes,
                (SELECT count(*) FROM sensor_readings) AS readings`
      )
    ]);

    const stats = deviceStats.rows[0]!;
    const total = Number(stats.total);
    const online = Number(stats.online);

    const firmwareDistribution: Record<string, number> = {};
    for (const row of firmware.rows) {
      firmwareDistribution[row.firmware_version ?? 'unknown'] = Number(row.count);
    }

    res.json({
      totalDevices: total,
      onlineDevices: online,
      offlineDevices: total - online,
      firmwareDistribution,
      averageBatteryLevel: stats.avg_battery === null ? null : Math.round(stats.avg_battery),
      averageWifiRssi: null,
      totalUsers: Number(counts.rows[0]!.users),
      totalHomes: Number(counts.rows[0]!.homes),
      totalReadings: Number(counts.rows[0]!.readings)
    });
  })
);

// POST /admin/ota - Initiate OTA update (still a mock; no OTA backend yet)
router.post('/ota', (req: AuthRequest, res) => {
  const { firmwareVersion, targetDeviceIds } = req.body as {
    firmwareVersion?: unknown;
    targetDeviceIds?: unknown;
  };

  if (typeof firmwareVersion !== 'string' || !Array.isArray(targetDeviceIds)) {
    res.status(400).json({ error: 'firmwareVersion and targetDeviceIds[] are required' });
    return;
  }

  const jobId = `ota-${Date.now()}`;

  res.json({
    success: true,
    job: {
      id: jobId,
      firmwareVersion,
      targetDeviceIds,
      status: 'pending',
      createdAt: new Date().toISOString(),
      message: 'OTA update job queued successfully'
    }
  });
});

export default router;
