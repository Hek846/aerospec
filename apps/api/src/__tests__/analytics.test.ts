import express from 'express';
import { EventEmitter } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { generateToken } from '../auth/middleware.js';
import { errorHandler } from '../middleware/errorHandler.js';
import analyticsRoutes from '../routes/analytics.js';

const token = generateToken({
  userId: '11111111-1111-1111-1111-111111111111',
  role: 'user',
  email: 'test@example.com'
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/analytics', analyticsRoutes);
  app.use(errorHandler);
  return app;
}

function request(path: string): Promise<{ status: number; body: unknown }> {
  const app = createApp();
  const requestEmitter = new EventEmitter();
  const responseEmitter = new EventEmitter();
  const headers = new Map<string, number | string | string[]>();

  const req = {
    method: 'GET',
    url: path,
    headers: {
      authorization: `Bearer ${token}`
    },
    on: requestEmitter.on.bind(requestEmitter),
    once: requestEmitter.once.bind(requestEmitter),
    removeListener: requestEmitter.removeListener.bind(requestEmitter)
  };

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader: (name: string, value: number | string | string[]) => {
        headers.set(name.toLowerCase(), value);
      },
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      removeHeader: (name: string) => {
        headers.delete(name.toLowerCase());
      },
      on: responseEmitter.on.bind(responseEmitter),
      once: responseEmitter.once.bind(responseEmitter),
      removeListener: responseEmitter.removeListener.bind(responseEmitter),
      end: (chunk?: string | Buffer) => {
        res.headersSent = true;
        resolve({
          status: res.statusCode,
          body: chunk ? JSON.parse(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk) : null
        });
      }
    };

    (app as unknown as { handle: (req: unknown, res: unknown, next: (err: Error) => void) => void }).handle(
      req,
      res,
      reject
    );
  });
}

describe('analytics route validation', () => {
  let consoleError: { mockRestore: () => void };

  beforeAll(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it('rejects a bad trends range before DB access', async () => {
    const response = await request('/analytics/trends?homeId=home-1&range=bad&metric=score');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'range must be day, week, month, or year', statusCode: 400 }
    });
  });

  it('rejects a bad trends metric before DB access', async () => {
    const response = await request('/analytics/trends?homeId=home-1&range=week&metric=temperature');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        message: 'metric must be score, pm25, pm10, co2, vocIndex, humidity, or aqi',
        statusCode: 400
      }
    });
  });

  it('rejects bad calendar month formats before DB access', async () => {
    const response = await request('/analytics/calendar?homeId=home-1&month=2026-13');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'month must be a valid calendar month', statusCode: 400 }
    });
  });
});
