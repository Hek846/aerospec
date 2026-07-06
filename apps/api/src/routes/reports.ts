import express, { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth/middleware.js';
import { reportSummaries, getHomesForUser } from '../data/loader.js';

const router: Router = express.Router();

// GET /reports/weekly - Weekly report summaries
router.get('/weekly', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const userHomes = getHomesForUser(userId);
  const userHomeIds = userHomes.map(h => h.id);

  // Filter reports for user's homes
  const userReports = reportSummaries
    .filter(report => userHomeIds.includes(report.homeId))
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  res.json({
    reports: userReports,
    total: userReports.length
  });
});

// GET /reports/:reportId - Get specific report
router.get('/:reportId', authenticateToken, (req: AuthRequest, res) => {
  const { reportId } = req.params;
  const userId = req.user!.userId;

  const report = reportSummaries.find(r => r.id === reportId);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  // Verify user has access
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === report.homeId)) {
    res.status(403).json({ error: 'Access denied to this report' });
    return;
  }

  res.json({ report });
});

// GET /reports/:reportId/export?format=csv|json
router.get('/:reportId/export', authenticateToken, (req: AuthRequest, res) => {
  const { reportId } = req.params;
  const { format = 'json' } = req.query;
  const userId = req.user!.userId;

  const report = reportSummaries.find(r => r.id === reportId);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  // Verify user has access
  const userHomes = getHomesForUser(userId);
  if (!userHomes.find(h => h.id === report.homeId)) {
    res.status(403).json({ error: 'Access denied to this report' });
    return;
  }

  if (format === 'csv') {
    // Generate CSV for room stats
    const headers = ['roomId', 'avgAqi', 'maxAqi', 'maxAqiTimestamp'];
    const csvRows = [
      headers.join(','),
      ...report.summaryStats.rooms.map(room =>
        [room.roomId, room.avgAqi, room.maxAqi, room.maxAqiTimestamp].join(',')
      ),
      '', // Empty line
      'Metrics Summary',
      'metric,avgValue,maxValue,alertCount',
      ...report.summaryStats.metrics.map(metric =>
        [metric.metric, metric.avgValue, metric.maxValue, metric.alertCount].join(',')
      )
    ];

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
    res.send(csvContent);
  } else {
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
    res.json(report);
  }
});

export default router;
