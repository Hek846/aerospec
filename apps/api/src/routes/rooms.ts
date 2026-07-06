import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { getRoomById, getDeviceById, getLatestReadingForDevice, getHomesForUser } from '../data/loader.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

// GET /rooms/:roomId - Room details and latest readings
router.get('/:roomId', authenticateToken, (req: AuthRequest, res) => {
  const { roomId } = req.params;
  const userId = req.user!.userId;

  const room = getRoomById(roomId);
  if (!room) {
    throw new AppError('Room not found', 404);
  }

  // Verify user has access to this home
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === room.homeId)) {
    throw new AppError('Access denied to this room', 403);
  }

  const device = getDeviceById(room.deviceId);
  const latestReading = device ? getLatestReadingForDevice(device.id) : null;

  res.json({
    room,
    device,
    latestReading
  });
});

export default router;
