import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import { isUuid, userHasHomeAccess } from '../db/queries.js';
import { Annotation, FactorTag, FACTOR_TAGS } from '@aerospec/types';

const router: Router = express.Router();

interface AnnotationRow {
  id: string;
  home_id: string;
  room_id: string | null;
  device_id: string | null;
  user_id: string;
  ts: Date;
  tags: string[];
  note: string | null;
  created_at: Date;
}

function mapAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    homeId: row.home_id,
    roomId: row.room_id,
    deviceId: row.device_id,
    userId: row.user_id,
    ts: row.ts.toISOString(),
    tags: row.tags as FactorTag[],
    note: row.note,
    createdAt: row.created_at.toISOString()
  };
}

function parseUuid(raw: unknown, name: string): string {
  if (typeof raw !== 'string' || !isUuid(raw)) {
    throw new AppError(`${name} must be a valid UUID`, 400);
  }
  return raw;
}

function parseOptionalUuid(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || !isUuid(raw)) {
    throw new AppError('Invalid UUID format', 400);
  }
  return raw;
}

function parseIsoTs(raw: unknown, name: string): Date {
  if (typeof raw !== 'string' || Number.isNaN(Date.parse(raw))) {
    throw new AppError(`${name} must be a valid ISO timestamp`, 400);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${name} must be a valid ISO timestamp`, 400);
  }
  return date;
}

function parseTags(raw: unknown): FactorTag[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError('tags must be a non-empty array', 400);
  }
  for (const tag of raw) {
    if (typeof tag !== 'string' || !FACTOR_TAGS.includes(tag as FactorTag)) {
      throw new AppError(`Invalid tag: ${tag}`, 400);
    }
  }
  return raw as FactorTag[];
}

function parseNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw new AppError('note must be a string', 400);
  }
  return raw.trim() || null;
}

async function ensureHomeMembership(req: AuthRequest, homeId: string): Promise<void> {
  if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
    throw new AppError('Access denied to this home', 403);
  }
}

async function isHomeOwner(userId: string, homeId: string): Promise<boolean> {
  const result = await getPool().query(
    'SELECT 1 FROM home_members WHERE home_id = $1 AND user_id = $2 AND role = $3',
    [homeId, userId, 'owner']
  );
  return (result.rowCount ?? 0) > 0;
}

async function requireAnnotationAccess(
  req: AuthRequest,
  annotationId: string
): Promise<AnnotationRow> {
  if (!isUuid(annotationId)) {
    throw new AppError('Annotation not found', 404);
  }

  const result = await getPool().query<AnnotationRow>(
    'SELECT * FROM annotations WHERE id = $1',
    [annotationId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new AppError('Annotation not found', 404);
  }

  const user = req.user!;
  if (
    user.role === 'admin' ||
    row.user_id === user.userId ||
    (await isHomeOwner(user.userId, row.home_id))
  ) {
    return row;
  }

  throw new AppError('Access denied to this annotation', 403);
}

// POST /annotations {homeId, roomId?, deviceId?, ts, tags, note?}
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { homeId, roomId, deviceId, ts, tags, note } = req.body as {
      homeId?: unknown;
      roomId?: unknown;
      deviceId?: unknown;
      ts?: unknown;
      tags?: unknown;
      note?: unknown;
    };

    const parsedHomeId = parseUuid(homeId, 'homeId');
    const parsedRoomId = parseOptionalUuid(roomId);
    const parsedDeviceId = parseOptionalUuid(deviceId);
    const parsedTs = parseIsoTs(ts, 'ts');
    const parsedTags = parseTags(tags);
    const parsedNote = parseNote(note);

    await ensureHomeMembership(req, parsedHomeId);

    const result = await getPool().query<AnnotationRow>(
      `INSERT INTO annotations (home_id, room_id, device_id, user_id, ts, tags, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parsedHomeId, parsedRoomId, parsedDeviceId, req.user!.userId, parsedTs, parsedTags, parsedNote]
    );

    res.status(201).json({ annotation: mapAnnotation(result.rows[0]!) });
  })
);

// GET /annotations?homeId&from&to
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = parseUuid(req.query.homeId, 'homeId');
    const from = req.query.from ? parseIsoTs(req.query.from, 'from') : undefined;
    const to = req.query.to ? parseIsoTs(req.query.to, 'to') : undefined;

    await ensureHomeMembership(req, homeId);

    const conditions = ['home_id = $1'];
    const params: unknown[] = [homeId];
    let idx = 2;
    if (from) {
      conditions.push(`ts >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`ts <= $${idx++}`);
      params.push(to);
    }

    const result = await getPool().query<AnnotationRow>(
      `SELECT * FROM annotations
        WHERE ${conditions.join(' AND ')}
        ORDER BY ts DESC`,
      params
    );
    const annotations = result.rows.map(mapAnnotation);

    res.json({ annotations, total: annotations.length });
  })
);

// PATCH /annotations/:id {tags?, note?, ts?}
router.patch(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const annotation = await requireAnnotationAccess(req, req.params.id);
    const { tags, note, ts } = req.body as {
      tags?: unknown;
      note?: unknown;
      ts?: unknown;
    };

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (tags !== undefined) {
      const parsedTags = parseTags(tags);
      updates.push(`tags = $${idx++}`);
      params.push(parsedTags);
    }
    if (note !== undefined) {
      const parsedNote = parseNote(note);
      updates.push(`note = $${idx++}`);
      params.push(parsedNote);
    }
    if (ts !== undefined) {
      const parsedTs = parseIsoTs(ts, 'ts');
      updates.push(`ts = $${idx++}`);
      params.push(parsedTs);
    }

    if (updates.length === 0) {
      res.json({ annotation: mapAnnotation(annotation) });
      return;
    }

    params.push(req.params.id);
    const result = await getPool().query<AnnotationRow>(
      `UPDATE annotations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ annotation: mapAnnotation(result.rows[0]!) });
  })
);

// DELETE /annotations/:id
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    await requireAnnotationAccess(req, req.params.id);
    await getPool().query('DELETE FROM annotations WHERE id = $1', [req.params.id]);
    res.status(204).send();
  })
);

export default router;
