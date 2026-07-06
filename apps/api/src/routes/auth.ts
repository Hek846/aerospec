import express, { Router, Response } from 'express';
import { getPool } from '../db/pool.js';
import { getUserHomeIds } from '../db/queries.js';
import {
  authenticateToken,
  generateToken,
  AuthRequest,
  Role
} from '../auth/middleware.js';
import { hashPassword, comparePassword, isValidEmail } from '../auth/utils.js';
import { AppError } from '../middleware/errorHandler.js';

const router: Router = express.Router();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
}

async function buildUserResponse(user: Pick<UserRow, 'id' | 'name' | 'email' | 'role'>) {
  const homes = await getUserHomeIds(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    homes
  };
}

// POST /auth/register - Create account (role 'user', no home yet)
router.post('/register', async (req, res: Response, next) => {
  try {
    const { name, email, password } = req.body as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    };

    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Name is required', 400);
    }
    if (typeof email !== 'string' || !isValidEmail(email)) {
      throw new AppError('A valid email is required', 400);
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getPool().query('SELECT 1 FROM users WHERE email = $1', [
      normalizedEmail
    ]);
    if ((existing.rowCount ?? 0) > 0) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);
    const result = await getPool().query<UserRow>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, password_hash, name, role`,
      [normalizedEmail, passwordHash, name.trim()]
    );
    const user = result.rows[0]!;

    const token = generateToken({ userId: user.id, role: user.role, email: user.email });
    res.status(201).json({ token, user: await buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login - Verify credentials, return JWT
router.post('/login', async (req, res: Response, next) => {
  try {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || email.length === 0) {
      throw new AppError('Email is required', 400);
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new AppError('Password is required', 400);
    }

    const result = await getPool().query<UserRow>(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken({ userId: user.id, role: user.role, email: user.email });
    res.json({ token, user: await buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me - Current user from JWT
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const result = await getPool().query<UserRow>(
      'SELECT id, email, password_hash, name, role FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const user = result.rows[0];
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json({ user: await buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
