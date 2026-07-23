import { describe, it, expect } from 'vitest';
import { buildApp } from './app';

describe('GET /health', () => {
  it('возвращает 200 и { status: ok }', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });

    await app.close();
  });
});

describe('CORS preflight', () => {
  // Регрессия: дефолт @fastify/cors разрешал только GET,HEAD,POST — браузер
  // блокировал PATCH/DELETE, и правки карточек молча откатывались.
  it('разрешает PATCH и DELETE для фронта', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/cards/00000000-0000-0000-0000-000000000000/move',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(res.statusCode).toBe(204);
    const allowed = res.headers['access-control-allow-methods'];
    expect(allowed).toContain('PATCH');
    expect(allowed).toContain('DELETE');

    await app.close();
  });
});
