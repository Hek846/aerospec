import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import homeRoutes from './routes/homes.js';
import roomRoutes from './routes/rooms.js';
import deviceRoutes from './routes/devices.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import compareRoutes from './routes/compare.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Sensair API server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
