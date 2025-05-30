import { createApp } from './app';
import supertest from 'supertest';

describe('App', () => {
  let app: any;
  let request: any;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 and status ok for /health', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return 200 and status ready for /readyz', async () => {
    const res = await request.get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  it('should return 200 and status alive for /livez', async () => {
    const res = await request.get('/livez');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'alive' });
  });
});
