import express, { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth/middleware.js';
import { devices } from '../data/loader.js';

const router: Router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /admin/devices - Admin-only fleet list
router.get('/devices', (req: AuthRequest, res) => {
  // Return all devices with their status
  const deviceStats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    devices: devices.map(d => ({
      id: d.id,
      name: d.name,
      deploymentId: d.deploymentId,
      homeId: d.homeId,
      roomId: d.roomId,
      status: d.status,
      firmwareVersion: d.firmwareVersion,
      lastSeen: d.lastSeen,
      wifiRssi: d.wifiRssi,
      batteryLevel: d.batteryLevel
    }))
  };

  res.json(deviceStats);
});

// GET /admin/stats - System-wide statistics
router.get('/stats', (req: AuthRequest, res) => {
  const firmwareVersions = devices.reduce((acc, device) => {
    acc[device.firmwareVersion] = (acc[device.firmwareVersion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.status === 'online').length,
    offlineDevices: devices.filter(d => d.status === 'offline').length,
    firmwareDistribution: firmwareVersions,
    averageBatteryLevel: devices.reduce((sum, d) => sum + d.batteryLevel, 0) / devices.length,
    averageWifiRssi: devices.reduce((sum, d) => sum + d.wifiRssi, 0) / devices.length
  });
});

// POST /admin/ota - Initiate OTA update
router.post('/ota', (req: AuthRequest, res) => {
  const { firmwareVersion, targetDeviceIds } = req.body;

  if (!firmwareVersion || !targetDeviceIds || !Array.isArray(targetDeviceIds)) {
    res.status(400).json({ error: 'firmwareVersion and targetDeviceIds[] are required' });
    return;
  }

  // Mock OTA job creation
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
