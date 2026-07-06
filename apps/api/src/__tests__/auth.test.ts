import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, AuthPayload } from '../auth/middleware.js';
import { hashPassword, comparePassword, isValidEmail } from '../auth/utils.js';

const payload: AuthPayload = {
  userId: 'user-123',
  role: 'user',
  email: 'test@example.com'
};

describe('generateToken', () => {
  it('generates a valid JWT containing userId, role and email', () => {
    const token = generateToken(payload);
    expect(token.split('.')).toHaveLength(3);

    const decoded = jwt.decode(token) as AuthPayload & { exp: number };
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash).not.toBe('correct-horse-battery');
    expect(await comparePassword('correct-horse-battery', hash)).toBe(true);
    expect(await comparePassword('wrong-password', hash)).toBe(false);
  });

  it('salts hashes (same input, different output)', async () => {
    const h1 = await hashPassword('password123');
    const h2 = await hashPassword('password123');
    expect(h1).not.toBe(h2);
  });
});

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.io')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@example.com')).toBe(false);
  });
});
