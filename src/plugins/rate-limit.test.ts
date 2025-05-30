import fastify from 'fastify';
import rateLimitPlugin from './rate-limit';

describe('rate-limit plugin', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    app = fastify();
    await app.register(rateLimitPlugin, {
      windowMs: 1000, // 1 second window for test
      max: 2, // allow 2 requests per window
      statusCode: 429,
      message: 'Too many requests',
    });
    app.get('/test', async () => ({ ok: true }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow requests under the limit', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/test' });
    expect(res1.statusCode).toBe(200);
    const res2 = await app.inject({ method: 'GET', url: '/test' });
    expect(res2.statusCode).toBe(200);
  });

  it('should block requests over the limit', async () => {
    await app.inject({ method: 'GET', url: '/test' });
    await app.inject({ method: 'GET', url: '/test' });
    const res3 = await app.inject({ method: 'GET', url: '/test' });
    expect(res3.statusCode).toBe(429);
    expect(res3.json()).toEqual({ error: 'Too many requests' });
  });
}); 