import express, { Router } from 'express';
import { getUserByEmail } from '../data/loader.js';
import { generateToken } from '../auth/middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

// Mock login endpoint - accepts email and returns JWT token
router.post('/login', (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = getUserByEmail(email);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // In a real app, we'd verify password with bcrypt
  // For demo purposes, any password works
  const token = generateToken({
    userId: user.id,
    role: user.role,
    email: user.email
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      homes: user.homes
    }
  });
});

// Get current user info
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  // In a real implementation, decode JWT and return user info
  res.json({ message: 'Token is valid' });
});

export default router;
