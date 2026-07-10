import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';
import authRoutes from './routes/auth.js';
import homeRoutes from './routes/homes.js';
import roomRoutes from './routes/rooms.js';
import deviceRoutes from './routes/devices.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import compareRoutes from './routes/compare.js';
import ingestRoutes from './routes/ingest.js';
import mapRoutes from './routes/map.js';
import externalRoutes from './routes/external.js';
import analyticsRoutes from './routes/analytics.js';
import annotationRoutes from './routes/annotations.js';
import { errorHandler } from './middleware/errorHandler.js';

// Env is read lazily elsewhere (pool, JWT secret), so config() here is safe
// even though static imports are hoisted above it.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/homes', homeRoutes);
app.use('/rooms', roomRoutes);
app.use('/devices', deviceRoutes);
app.use('/alerts', alertRoutes);
app.use('/reports', reportRoutes);
app.use('/admin', adminRoutes);
app.use('/compare', compareRoutes);
app.use('/ingest', ingestRoutes);
app.use('/map', mapRoutes);
app.use('/external', externalRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/annotations', annotationRoutes);

// Error handling
app.use(errorHandler);

// Apply migrations (and optionally seed) before accepting traffic
await runMigrations();

if (process.env.SEED_ON_BOOT === 'true') {
  const seeded = await seedIfEmpty();
  if (seeded) {
    console.log('🌱 Database was empty — demo data seeded');
  }
}

app.listen(PORT, () => {
  console.log(`🚀 AeroSpec API server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
