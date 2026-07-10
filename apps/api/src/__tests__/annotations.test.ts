import express from 'express';
import { EventEmitter } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { generateToken } from '../auth/middleware.js';
import { errorHandler } from '../middleware/errorHandler.js';
import annotationRoutes from '../routes/annotations.js';

const token = generateToken({
  userId: '11111111-1111-1111-1111-111111111111',
  role: 'user',
  email: 'test@example.com'
});

function createApp() {
  const app = express();
  app.use('/annotations', annotationRoutes);
  app.use(errorHandler);
  return app;
}

function request(
  method: string,
  path: string,
  body?: unknown,
  authToken: string | null = token
): Promise<{ status: number; body: unknown }> {
  const app = createApp();
  const responseEmitter = new EventEmitter();
  const headers = new Map<string, number | string | string[]>();

  const req = {
    method,
    url: path,
    headers: {
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
    },
    body
  };

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
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

    (
      app as unknown as {
        handle: (req: unknown, res: unknown, next: (err: Error) => void) => void;
      }
    ).handle(req, res, reject);
  });
}

describe('annotations route validation', () => {
  let consoleError: { mockRestore: () => void };

  beforeAll(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it('requires authentication', async () => {
    const response = await request(
      'GET',
      '/annotations?homeId=11111111-1111-1111-1111-111111111111',
      undefined,
      null
    );
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { message: 'Authentication required', statusCode: 401 }
    });
  });

  it('rejects missing homeId on POST', async () => {
    const response = await request('POST', '/annotations', {
      ts: new Date().toISOString(),
      tags: ['cooking']
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'homeId must be a valid UUID', statusCode: 400 }
    });
  });

  it('rejects empty tags on POST', async () => {
    const response = await request('POST', '/annotations', {
      homeId: '11111111-1111-1111-1111-111111111111',
      ts: new Date().toISOString(),
      tags: []
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'tags must be a non-empty array', statusCode: 400 }
    });
  });

  it('rejects invalid tag on POST', async () => {
    const response = await request('POST', '/annotations', {
      homeId: '11111111-1111-1111-1111-111111111111',
      ts: new Date().toISOString(),
      tags: ['cooking', 'not-a-tag']
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'Invalid tag: not-a-tag', statusCode: 400 }
    });
  });

  it('rejects missing ts on POST', async () => {
    const response = await request('POST', '/annotations', {
      homeId: '11111111-1111-1111-1111-111111111111',
      tags: ['cooking']
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'ts must be a valid ISO timestamp', statusCode: 400 }
    });
  });

  it('rejects missing homeId on GET', async () => {
    const response = await request('GET', '/annotations');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { message: 'homeId must be a valid UUID', statusCode: 400 }
    });
  });

  it('rejects invalid annotation id on PATCH', async () => {
    const response = await request('PATCH', '/annotations/not-a-uuid', {
      tags: ['cooking']
    });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { message: 'Annotation not found', statusCode: 404 }
    });
  });
});
