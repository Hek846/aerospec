import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/pool.js';
import { getUserHomeIds, userHasHomeAccess, isUuid } from '../db/queries.js';

const router: Router = express.Router();

interface RoomStats {
  roomId: string;
  avgAqi: number;
  maxAqi: number;
  maxAqiTimestamp: string;
}

interface MetricStats {
  metric: string;
  avgValue: number;
  maxValue: number;
  /** Extra field consumed by the web Reports page */
  minValue: number;
  alertCount: number;
}

interface ReportSummary {
  id: string;
  homeId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summaryStats: {
    rooms: RoomStats[];
    metrics: MetricStats[];
    totalAlerts: number;
  };
  worstRoomId?: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Compute the last-7-days report for a home on the fly. */
async function computeWeeklyReport(homeId: string): Promise<ReportSummary> {
  const pool = getPool();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const roomAgg = await pool.query<{
    room_id: string;
    avg_aqi: number | null;
    max_aqi: number | null;
  }>(
    `SELECT r.id AS room_id, avg(sr.aqi)::real AS avg_aqi, max(sr.aqi)::real AS max_aqi
       FROM rooms r
       JOIN devices d ON d.room_id = r.id
       JOIN sensor_readings sr ON sr.device_id = d.id AND sr.ts >= now() - interval '7 days'
      WHERE r.home_id = $1
      GROUP BY r.id`,
    [homeId]
  );

  const roomMaxTs = await pool.query<{ room_id: string; ts: Date }>(
    `SELECT DISTINCT ON (r.id) r.id AS room_id, sr.ts
       FROM rooms r
       JOIN devices d ON d.room_id = r.id
       JOIN sensor_readings sr ON sr.device_id = d.id AND sr.ts >= now() - interval '7 days'
      WHERE r.home_id = $1 AND sr.aqi IS NOT NULL
      ORDER BY r.id, sr.aqi DESC, sr.ts DESC`,
    [homeId]
  );
  const maxTsByRoom = new Map(roomMaxTs.rows.map((r) => [r.room_id, r.ts]));

  const rooms: RoomStats[] = roomAgg.rows.map((row) => ({
    roomId: row.room_id,
    avgAqi: round1(row.avg_aqi ?? 0),
    maxAqi: round1(row.max_aqi ?? 0),
    maxAqiTimestamp: (maxTsByRoom.get(row.room_id) ?? periodStart).toISOString()
  }));

  const metricAgg = await pool.query<{
    avg_pm25: number | null;
    max_pm25: number | null;
    min_pm25: number | null;
    avg_pm10: number | null;
    max_pm10: number | null;
    min_pm10: number | null;
    avg_co2: number | null;
    max_co2: number | null;
    min_co2: number | null;
    avg_voc: number | null;
    max_voc: number | null;
    min_voc: number | null;
    avg_noise: number | null;
    max_noise: number | null;
    min_noise: number | null;
  }>(
    `SELECT avg(coalesce(sr.pm25_corr, sr.pm25_env))::real AS avg_pm25,
            max(coalesce(sr.pm25_corr, sr.pm25_env))::real AS max_pm25,
            min(coalesce(sr.pm25_corr, sr.pm25_env))::real AS min_pm25,
            avg(sr.pm10_env)::real AS avg_pm10,
            max(sr.pm10_env)::real AS max_pm10,
            min(sr.pm10_env)::real AS min_pm10,
            avg(sr.co2)::real AS avg_co2,
            max(sr.co2)::real AS max_co2,
            min(sr.co2)::real AS min_co2,
            avg(sr.voc_index)::real AS avg_voc,
            max(sr.voc_index)::real AS max_voc,
            min(sr.voc_index)::real AS min_voc,
            avg(sr.noise_db)::real AS avg_noise,
            max(sr.noise_db)::real AS max_noise,
            min(sr.noise_db)::real AS min_noise
       FROM sensor_readings sr
       JOIN devices d ON d.id = sr.device_id
      WHERE d.home_id = $1 AND sr.ts >= now() - interval '7 days'`,
    [homeId]
  );

  const alertCounts = await pool.query<{ metric: string; count: string }>(
    `SELECT e.metric, count(*) AS count
       FROM alert_events e
       JOIN devices d ON d.id = e.device_id
      WHERE d.home_id = $1 AND e.ts >= now() - interval '7 days'
      GROUP BY e.metric`,
    [homeId]
  );
  const alertCountByMetric = new Map(
    alertCounts.rows.map((r) => [r.metric, Number(r.count)])
  );
  const totalAlerts = [...alertCountByMetric.values()].reduce((a, b) => a + b, 0);

  const agg = metricAgg.rows[0];
  const metrics: MetricStats[] = [
    { metric: 'pm25', avg: agg?.avg_pm25, max: agg?.max_pm25, min: agg?.min_pm25 },
    { metric: 'pm10', avg: agg?.avg_pm10, max: agg?.max_pm10, min: agg?.min_pm10 },
    { metric: 'co2', avg: agg?.avg_co2, max: agg?.max_co2, min: agg?.min_co2 },
    { metric: 'vocIndex', avg: agg?.avg_voc, max: agg?.max_voc, min: agg?.min_voc },
    { metric: 'noiseDb', avg: agg?.avg_noise, max: agg?.max_noise, min: agg?.min_noise }
  ].map((m) => ({
    metric: m.metric,
    avgValue: round1(m.avg ?? 0),
    maxValue: round1(m.max ?? 0),
    minValue: round1(m.min ?? 0),
    alertCount: alertCountByMetric.get(m.metric) ?? 0
  }));

  const worstRoom = [...rooms].sort((a, b) => b.avgAqi - a.avgAqi)[0];

  return {
    id: `weekly-${homeId}`,
    homeId,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    generatedAt: now.toISOString(),
    summaryStats: { rooms, metrics, totalAlerts },
    ...(worstRoom ? { worstRoomId: worstRoom.roomId } : {})
  };
}

/** Resolve a report id (`weekly-<homeId>`) to a home the user can access. */
async function resolveReportHome(req: AuthRequest, reportId: string): Promise<string> {
  if (!reportId.startsWith('weekly-')) {
    throw new AppError('Report not found', 404);
  }
  const homeId = reportId.slice('weekly-'.length);
  if (!isUuid(homeId)) {
    throw new AppError('Report not found', 404);
  }
  if (!(await userHasHomeAccess(req.user!.userId, homeId, req.user!.role))) {
    throw new AppError('Access denied to this report', 403);
  }
  return homeId;
}

// GET /reports/weekly - Weekly report per accessible home, computed on the fly
router.get(
  '/weekly',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeIds = await getUserHomeIds(req.user!.userId);
    const reports = await Promise.all(homeIds.map((homeId) => computeWeeklyReport(homeId)));

    res.json({ reports, total: reports.length });
  })
);

// GET /reports/:reportId - Single report (recomputed)
router.get(
  '/:reportId',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = await resolveReportHome(req, req.params.reportId);
    const report = await computeWeeklyReport(homeId);
    res.json({ report });
  })
);

// GET /reports/:reportId/export?format=csv|json
router.get(
  '/:reportId/export',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const homeId = await resolveReportHome(req, req.params.reportId);
    const report = await computeWeeklyReport(homeId);
    const format = req.query.format === 'csv' ? 'csv' : 'json';

    if (format === 'csv') {
      const csvRows = [
        'roomId,avgAqi,maxAqi,maxAqiTimestamp',
        ...report.summaryStats.rooms.map((room) =>
          [room.roomId, room.avgAqi, room.maxAqi, room.maxAqiTimestamp].join(',')
        ),
        '',
        'Metrics Summary',
        'metric,avgValue,maxValue,alertCount',
        ...report.summaryStats.metrics.map((metric) =>
          [metric.metric, metric.avgValue, metric.maxValue, metric.alertCount].join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${req.params.reportId}.csv"`
      );
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${req.params.reportId}.json"`
      );
      res.json(report);
    }
  })
);

export default router;
