import request from 'supertest';
import { createApp } from '../../src/app';
import { TestDatabase } from '../utils/test-database';
import { EventFactory } from '../factories/event.factory';
import { PrismaClient } from '@prisma/client';

describe('Event Flow E2E Tests', () => {
  let testDb: TestDatabase;
  let prisma: PrismaClient;
  let authToken: string;
  let app: any;

  beforeAll(async () => {
    testDb = new TestDatabase();
    prisma = await testDb.start();
    app = await createApp();
    await app.ready();

    // Set up authentication
    const response = await request(app.server)
      .post('/api/auth/login')
      .send({
        username: process.env.TEST_USER_USERNAME || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'test123!',
      });

    authToken = response.body.token;
  });

  afterAll(async () => {
    await testDb.stop();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('Complete Event Flow', () => {
    it('should handle the complete event lifecycle', async () => {
      // 1. Create a new event
      const eventData = EventFactory.create();
      const createResponse = await request(app.server)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      const eventId = createResponse.body.id;

      // 2. Verify the event was created
      const getResponse = await request(app.server)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toMatchObject(eventData);

      // 3. Create a webhook subscription
      const webhookData = {
        url: 'http://localhost:9999/webhook',
        events: ['user'],
        active: true,
      };

      const webhookResponse = await request(app.server)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData)
        .expect(201);

      // 4. Create an event that triggers the webhook
      const triggerEventData = EventFactory.create({ eventType: 'user' });
      await request(app.server)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(triggerEventData)
        .expect(201);

      // 5. Export events
      const exportResponse = await request(app.server)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          filters: {
            eventType: 'user',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        })
        .expect(200);

      expect(exportResponse.headers['content-type']).toBe('text/csv');

      // 6. Check rate limiting
      const promises = Array.from({ length: 11 }, () =>
        request(app.server).get('/api/events').set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(promises);
      const rateLimitedResponse = results[results.length - 1];

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body).toHaveProperty('error', 'Too Many Requests');

      // 7. Verify webhook delivery status
      const webhookDeliveries = await prisma.webhookDelivery.findMany({
        where: {
          webhookId: webhookResponse.body.id,
        },
      });

      expect(webhookDeliveries).toHaveLength(1);
      expect(webhookDeliveries[0]).toMatchObject({
        status: expect.any(String),
        eventId: expect.any(String),
      });
    });
  });
});
