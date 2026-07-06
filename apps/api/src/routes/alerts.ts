import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { alertRules, alertEvents, updateAlertEvent, getHomesForUser } from '../data/loader.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

// GET /alerts - Alert rules + events
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const userHomes = getHomesForUser(userId);
  const userHomeIds = userHomes.map(h => h.id);

  // Filter alert rules for user's homes
  const userAlertRules = alertRules.filter(rule =>
    !rule.homeId || userHomeIds.includes(rule.homeId)
  );

  // Filter alert events for user's homes (via devices)
  // This is simplified - in a real app we'd join through devices to homes
  const userAlertEvents = alertEvents.slice(0, 50); // Limit for performance

  res.json({
    rules: userAlertRules,
    events: userAlertEvents,
    totalRules: userAlertRules.length,
    totalEvents: userAlertEvents.length
  });
});

// GET /alerts/rules - Get all alert rules
router.get('/rules', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const userHomes = getHomesForUser(userId);
  const userHomeIds = userHomes.map(h => h.id);

  const userAlertRules = alertRules.filter(rule =>
    !rule.homeId || userHomeIds.includes(rule.homeId)
  );

  res.json({
    rules: userAlertRules,
    total: userAlertRules.length
  });
});

// GET /alerts/events - Get alert events with filtering
router.get('/events', authenticateToken, (req: AuthRequest, res) => {
  const { status, limit = '50' } = req.query;

  let filteredEvents = [...alertEvents];

  // Filter by status if provided
  if (status && typeof status === 'string') {
    filteredEvents = filteredEvents.filter(e => e.status === status);
  }

  // Sort by timestamp (newest first)
  filteredEvents.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply limit
  const limitNum = parseInt(limit as string, 10);
  filteredEvents = filteredEvents.slice(0, limitNum);

  res.json({
    events: filteredEvents,
    total: filteredEvents.length
  });
});

// POST /alerts/:alertId/ack - Acknowledge alert
router.post('/:alertId/ack', authenticateToken, (req: AuthRequest, res) => {
  const { alertId } = req.params;

  const updatedEvent = updateAlertEvent(alertId, {
    status: 'acknowledged'
  });

  if (!updatedEvent) {
    throw new AppError('Alert event not found', 404);
  }

  res.json({
    success: true,
    event: updatedEvent,
    message: 'Alert acknowledged successfully'
  });
});

// POST /alerts/:alertId/dismiss - Dismiss/close alert
router.post('/:alertId/dismiss', authenticateToken, (req: AuthRequest, res) => {
  const { alertId } = req.params;

  const updatedEvent = updateAlertEvent(alertId, {
    status: 'closed'
  });

  if (!updatedEvent) {
    throw new AppError('Alert event not found', 404);
  }

  res.json({
    success: true,
    event: updatedEvent,
    message: 'Alert dismissed successfully'
  });
});

export default router;
