import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  getRoomById,
  getDeviceRowById,
  getLatestReading,
  userHasHomeAccess,
  mapDevice
} from '../db/queries.js';

const router: Router = express.Router();

// GET /rooms/:roomId - Room details, device and latest reading
router.get(
  '/:roomId',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { roomId } = req.params;

    const room = await getRoomById(roomId);
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (!(await userHasHomeAccess(req.user!.userId, room.homeId, req.user!.role))) {
      throw new AppError('Access denied to this room', 403);
    }

    const deviceRow = room.deviceId ? await getDeviceRowById(room.deviceId) : null;
    const latestReading = deviceRow ? await getLatestReading(deviceRow.id) : null;

    res.json({
      room,
      device: deviceRow ? mapDevice(deviceRow) : null,
      latestReading
    });
  })
);

export default router;
