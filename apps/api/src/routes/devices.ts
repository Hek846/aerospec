import express, { Router } from 'express';
import { subHours, subDays, parseISO } from 'date-fns';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { getDeviceById, getReadingsForDevice, getHomesForUser } from '../data/loader.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

// GET /devices/:deviceId/readings?range=24h|7d&page=1&limit=100
router.get('/:deviceId/readings', authenticateToken, (req: AuthRequest, res) => {
  const { deviceId } = req.params;
  const { range = '24h', page = '1', limit = '100' } = req.query;
  const userId = req.user!.userId;

  const device = getDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', 404);
  }

  // Verify user has access to this device's home
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === device.homeId)) {
    throw new AppError('Access denied to this device', 403);
  }

  // Parse pagination parameters
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10))); // Max 1000 per page
  const offset = (pageNum - 1) * limitNum;

  // Get all readings for device
  const allReadings = getReadingsForDevice(deviceId);

  // Filter by time range
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

  const filteredReadings = allReadings.filter(reading =>
    parseISO(reading.timestamp) >= cutoffTime
  );

  // Apply pagination
  const paginatedReadings = filteredReadings.slice(offset, offset + limitNum);
  const totalPages = Math.ceil(filteredReadings.length / limitNum);

  res.json({
    deviceId,
    range,
    readings: paginatedReadings,
    pagination: {
      total: filteredReadings.length,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  });
});

// GET /compare?roomIds=...&range=...
router.get('/compare', authenticateToken, (req: AuthRequest, res) => {
  const { roomIds, range = '24h' } = req.query;

  if (!roomIds) {
    throw new AppError('roomIds parameter is required', 400);
  }

  const roomIdArray = (roomIds as string).split(',');

  // This is a simplified implementation
  // In a real app, we'd fetch and combine data from multiple rooms
  res.json({
    roomIds: roomIdArray,
    range,
    message: 'Comparison data endpoint - to be implemented with chart data'
  });
});

// GET /devices/:deviceId/export?range=24h|7d&format=csv|json
router.get('/:deviceId/export', authenticateToken, (req: AuthRequest, res) => {
  const { deviceId } = req.params;
  const { range = '24h', format = 'json' } = req.query;
  const userId = req.user!.userId;

  const device = getDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', 404);
  }

  // Verify user has access to this device's home
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === device.homeId)) {
    throw new AppError('Access denied to this device', 403);
  }

  // Get all readings for device
  const allReadings = getReadingsForDevice(deviceId);

  // Filter by time range
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

  const filteredReadings = allReadings.filter(reading =>
    parseISO(reading.timestamp) >= cutoffTime
  );

  if (format === 'csv') {
    // Generate CSV
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
    ];

    const csvRows = [
      headers.join(','),
      ...filteredReadings.map(reading =>
        headers.map(header => reading[header as keyof typeof reading]).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="device-${deviceId}-${range}.csv"`);
    res.send(csvContent);
  } else {
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="device-${deviceId}-${range}.json"`);
    res.json({
      device: {
        id: device.id,
        name: device.name,
        deploymentId: device.deploymentId
      },
      exportDate: new Date().toISOString(),
      range,
      totalReadings: filteredReadings.length,
      readings: filteredReadings
    });
  }
});

export default router;
