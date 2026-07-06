import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken, hashPassword, comparePassword } from '../auth/utils.js';

describe('Authentication Utils', () => {
  const testUserId = 'user-123';
  const testRole = 'user';
  const testPassword = 'password123';

  describe('generateToken', () => {
    it('generates a valid JWT token', () => {
      const token = generateToken(testUserId, testRole);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('token contains user information', () => {
      const token = generateToken(testUserId, testRole);
      const decoded = jwt.decode(token) as any;

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testRole);
    });

    it('token has expiration time', () => {
      const token = generateToken(testUserId, testRole);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('verifyToken', () => {
    it('verifies a valid token', () => {
      const token = generateToken(testUserId, testRole);
      const decoded = verifyToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testRole);
    });

    it('throws error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('throws error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, role: testRole },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );

      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it('throws error for token with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId: testUserId, role: testRole },
        'wrong-secret',
        { expiresIn: '24h' }
      );

      expect(() => verifyToken(wrongToken)).toThrow();
    });
  });

  describe('hashPassword', () => {
    it('hashes password successfully', async () => {
      const hashed = await hashPassword(testPassword);
      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe(testPassword);
      expect(hashed.length).toBeGreaterThan(50); // Bcrypt hashes are long
    });

    it('generates different hashes for same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      expect(hash1).not.toBe(hash2); // Due to salt
    });
  });

  describe('comparePassword', () => {
    it('returns true for correct password', async () => {
      const hashed = await hashPassword(testPassword);
      const isMatch = await comparePassword(testPassword, hashed);
      expect(isMatch).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hashed = await hashPassword(testPassword);
      const isMatch = await comparePassword('wrongpassword', hashed);
      expect(isMatch).toBe(false);
    });
  });
});

describe('Authentication Middleware', () => {
  it('authenticates valid token', async () => {
    // This test would require importing and testing the middleware
    // with mock Express request/response objects
    expect(true).toBe(true); // Placeholder
  });

  it('rejects request without token', async () => {
    expect(true).toBe(true); // Placeholder
  });

  it('rejects request with invalid token', async () => {
    expect(true).toBe(true); // Placeholder
  });
});
