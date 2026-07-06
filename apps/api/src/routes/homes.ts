import express, { Router } from 'express';
import { subHours, subDays, parseISO } from 'date-fns';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { getHomesForUser, getRoomsByHomeId, getLatestReadingForDevice, devices, getReadingsForDevice } from '../data/loader.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

// GET /homes - List homes accessible to user
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const userHomes = getHomesForUser(userId);

  res.json({
    homes: userHomes,
    total: userHomes.length
  });
});

// GET /homes/:homeId/rooms - Rooms + latest AQI per room
router.get('/:homeId/rooms', authenticateToken, (req: AuthRequest, res) => {
  const { homeId } = req.params;
  const userId = req.user!.userId;

  // Verify user has access to this home
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === homeId)) {
    throw new AppError('Access denied to this home', 403);
  }

  const rooms = getRoomsByHomeId(homeId);

  // Enrich rooms with latest AQI data
  const roomsWithAQI = rooms.map(room => {
    const device = devices.find(d => d.id === room.deviceId);
    const latestReading = device ? getLatestReadingForDevice(device.id) : null;

    return {
      ...room,
      latestAQI: latestReading?.aqi || null,
      latestTimestamp: latestReading?.timestamp || null,
      deviceStatus: device?.status || 'offline'
    };
  });

  res.json({
    homeId,
    rooms: roomsWithAQI,
    total: roomsWithAQI.length
  });
});

// GET /homes/:homeId/export?range=24h|7d|30d&format=csv|json
router.get('/:homeId/export', authenticateToken, (req: AuthRequest, res) => {
  const { homeId } = req.params;
  const { range = '24h', format = 'json' } = req.query;
  const userId = req.user!.userId;

  // Verify user has access to this home
  const userHomes = getHomesForUser(userId);
  const home = userHomes.find(h => h.id === homeId);
  if (!home) {
    throw new AppError('Access denied to this home', 403);
  }

  // Get all rooms and devices for this home
  const rooms = getRoomsByHomeId(homeId);
  const homeDevices = devices.filter(d => d.homeId === homeId);

  // Get readings for all devices
  const now = new Date();
  let cutoffTime: Date;

  switch (range) {
    case '24h':
      cutoffTime = subHours(now, 24);
      break;
    case '7d':
      cutoffTime = subDays(now, 7);
      break;
    case '30d':
      cutoffTime = subDays(now, 30);
      break;
    default:
      cutoffTime = subHours(now, 24);
  }

  // Collect all readings from all devices in the home
  const allReadings = homeDevices.flatMap(device => {
    const readings = getReadingsForDevice(device.id);
    return readings
      .filter(reading => parseISO(reading.timestamp) >= cutoffTime)
      .map(reading => ({
        ...reading,
        deviceName: device.name,
        roomName: rooms.find(r => r.deviceId === device.id)?.name || 'Unknown',
      }));
  });

  if (format === 'csv') {
    // Generate CSV
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
    ];

    const csvRows = [
      headers.join(','),
      ...allReadings.map(reading =>
        headers.map(header => {
          const value = reading[header as keyof typeof reading];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="home-${homeId}-${range}.csv"`);
    res.send(csvContent);
  } else {
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="home-${homeId}-${range}.json"`);
    res.json({
      home: {
        id: home.id,
        name: home.name,
        address: home.address
      },
      exportDate: new Date().toISOString(),
      range,
      totalDevices: homeDevices.length,
      totalReadings: allReadings.length,
      readings: allReadings
    });
  }
});

export default router;
