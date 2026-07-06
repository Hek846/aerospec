import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import {
  getUserHomeIds,
  isUuid,
  mapAlertRule,
  mapAlertEvent,
  AlertRuleRow,
  AlertEventRow
} from '../db/queries.js';

const router: Router = express.Router();

async function getRulesForUser(req: AuthRequest) {
  const pool = getPool();
  if (req.user!.role === 'admin') {
    const result = await pool.query<AlertRuleRow>(
      'SELECT * FROM alert_rules ORDER BY created_at'
    );
    return result.rows.map(mapAlertRule);
  }
  const homeIds = await getUserHomeIds(req.user!.userId);
  const result = await pool.query<AlertRuleRow>(
    `SELECT * FROM alert_rules
      WHERE home_id = ANY($1::uuid[])
         OR device_id IN (SELECT id FROM devices WHERE home_id = ANY($1::uuid[]))
      ORDER BY created_at`,
    [homeIds]
  );
  return result.rows.map(mapAlertRule);
}

async function getEventsForUser(
  req: AuthRequest,
  status: string | undefined,
  limit: number
) {
  const pool = getPool();

  if (req.user!.role === 'admin') {
    const params: unknown[] = status ? [limit, status] : [limit];
    const result = await pool.query<AlertEventRow>(
      `SELECT e.* FROM alert_events e
        ${status ? 'WHERE e.status = $2' : ''}
        ORDER BY e.ts DESC LIMIT $1`,
      params
    );
    return result.rows.map(mapAlertEvent);
  }

  const homeIds = await getUserHomeIds(req.user!.userId);
  const params: unknown[] = status ? [homeIds, status, limit] : [homeIds, limit];
  const result = await pool.query<AlertEventRow>(
    `SELECT e.* FROM alert_events e
      JOIN devices d ON d.id = e.device_id
     WHERE d.home_id = ANY($1::uuid[]) ${status ? 'AND e.status = $2' : ''}
     ORDER BY e.ts DESC
     LIMIT $${status ? 3 : 2}`,
    params
  );
  return result.rows.map(mapAlertEvent);
}

// GET /alerts - Alert rules + recent events for user's homes
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const [rules, events] = await Promise.all([
      getRulesForUser(req),
      getEventsForUser(req, undefined, 50)
    ]);

    res.json({
      rules,
      events,
      totalRules: rules.length,
      totalEvents: events.length
    });
  })
);

// GET /alerts/rules - Alert rules only
router.get(
  '/rules',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const rules = await getRulesForUser(req);
    res.json({ rules, total: rules.length });
  })
);

// GET /alerts/events?status=&limit= - Alert events with filtering
router.get(
  '/events',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

    const events = await getEventsForUser(req, status, limit);
    res.json({ events, total: events.length });
  })
);

async function updateEventStatus(
  req: AuthRequest,
  eventId: string,
  status: 'acknowledged' | 'closed'
) {
  const pool = getPool();

  if (!isUuid(eventId)) {
    throw new AppError('Alert event not found', 404);
  }

  if (req.user!.role !== 'admin') {
    const homeIds = await getUserHomeIds(req.user!.userId);
    const access = await pool.query(
      `SELECT 1 FROM alert_events e
        JOIN devices d ON d.id = e.device_id
       WHERE e.id = $1 AND d.home_id = ANY($2::uuid[])`,
      [eventId, homeIds]
    );
    if ((access.rowCount ?? 0) === 0) {
      throw new AppError('Alert event not found', 404);
    }
  }

  const result = await pool.query<AlertEventRow>(
    'UPDATE alert_events SET status = $2 WHERE id = $1 RETURNING *',
    [eventId, status]
  );
  const row = result.rows[0];
  if (!row) {
    throw new AppError('Alert event not found', 404);
  }
  return mapAlertEvent(row);
}

// POST /alerts/:alertId/ack - Acknowledge alert
router.post(
  '/:alertId/ack',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const event = await updateEventStatus(req, req.params.alertId, 'acknowledged');
    res.json({
      success: true,
      event,
      message: 'Alert acknowledged successfully'
    });
  })
);

// POST /alerts/:alertId/dismiss - Dismiss/close alert
router.post(
  '/:alertId/dismiss',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const event = await updateEventStatus(req, req.params.alertId, 'closed');
    res.json({
      success: true,
      event,
      message: 'Alert dismissed successfully'
    });
  })
);

export default router;
