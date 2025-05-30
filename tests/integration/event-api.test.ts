import request from 'supertest';
import { createApp } from '../../src/app';
import { TestDatabase } from '../utils/test-database';
import { EventFactory } from '../factories/event.factory';
import { PrismaClient, Prisma } from '@prisma/client';
import type { Event } from '../../src/interfaces/event.interface';
import type { FastifyInstance } from 'fastify';

// Utility to fix top-level nulls and ensure correct types for Prisma
function fixTopLevelJsonNullsMany(
  events: Array<Omit<Event, 'id' | 'createdAt'>>
): Prisma.EventCreateManyInput[] {
  return events.map(e => {
    const timestamp =
      typeof e.timestamp === 'string'
        ? e.timestamp
        : e.timestamp &&
            typeof (e.timestamp as { toISOString?: () => string }).toISOString === 'function'
          ? (e.timestamp as Date).toISOString()
          : String(e.timestamp);
    // Do not include updatedAt in the object sent to Prisma
    const { updatedAt: _updatedAt, ...rest } = e;
    return {
      ...rest,
      data: (e.data === null || e.data === undefined ? {} : e.data) as Prisma.InputJsonValue,
      metadata: (e.metadata === null || e.metadata === undefined
        ? {}
        : e.metadata) as Prisma.InputJsonValue,
      timestamp,
    };
  });
}
function fixTopLevelJsonNullsOne(e: Omit<Event, 'id' | 'createdAt'>): Prisma.EventCreateInput {
  const timestamp =
    typeof e.timestamp === 'string'
      ? e.timestamp
      : e.timestamp &&
          typeof (e.timestamp as { toISOString?: () => string }).toISOString === 'function'
        ? (e.timestamp as Date).toISOString()
        : String(e.timestamp);
  // Do not include updatedAt in the object sent to Prisma
  const { updatedAt: _updatedAt, ...rest } = e;
  return {
    ...rest,
    data: (e.data === null || e.data === undefined ? {} : e.data) as Prisma.InputJsonValue,
    metadata: (e.metadata === null || e.metadata === undefined
      ? {}
      : e.metadata) as Prisma.InputJsonValue,
    timestamp,
  };
}

describe('Event API Integration Tests', () => {
  let testDb: TestDatabase;
  let prisma: PrismaClient;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = new TestDatabase();
    prisma = await testDb.start();
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await testDb.stop();
    await app.close();
  });

  beforeEach(async () => {
    // Seed some test events
    let events = EventFactory.createMany(5).map(e => ({
      ...e,
      timestamp:
        typeof e.timestamp === 'string'
          ? e.timestamp
          : e.timestamp &&
              typeof (e.timestamp as { toISOString?: () => string }).toISOString === 'function'
            ? (e.timestamp as Date).toISOString()
            : String(e.timestamp),
      updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString(),
    }));
    await prisma.event.createMany({ data: fixTopLevelJsonNullsMany(events) });
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const eventData = EventFactory.create();

      const response = await request(app.server).post('/api/events').send(eventData).expect(201);

      expect(response.body).toMatchObject({
        ...eventData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify the event was saved in the database
      const savedEvent = await prisma.event.findUnique({
        where: { id: response.body.id },
      });

      expect(savedEvent).toMatchObject(eventData);
    });

    it('should validate event data', async () => {
      const invalidEventData = {
        eventType: 'invalid_type',
        source: '',
        timestamp: 'invalid_date',
      };

      const response = await request(app.server)
        .post('/api/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
      // Seed some test events
      let events = EventFactory.createMany(5).map(e => ({
        ...e,
        timestamp:
          typeof e.timestamp === 'string'
            ? e.timestamp
            : e.timestamp &&
                typeof (e.timestamp as { toISOString?: () => string }).toISOString === 'function'
              ? (e.timestamp as Date).toISOString()
              : String(e.timestamp),
        updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString(),
      }));
      await prisma.event.createMany({ data: fixTopLevelJsonNullsMany(events) });
    });

    it('should return paginated events', async () => {
      const response = await request(app.server)
        .get('/api/events')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            eventType: expect.any(String),
            source: expect.any(String),
            timestamp: expect.any(String),
          }),
        ]),
        total: 5,
        page: 1,
        limit: 2,
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should filter events by eventType', async () => {
      const specificType = 'user';
      let eventData = EventFactory.create({
        eventType: specificType,
        updatedAt: new Date().toISOString(),
      });
      await prisma.event.create({ data: fixTopLevelJsonNullsOne(eventData) });

      const response = await request(app.server)
        .get('/api/events')
        .query({ eventType: specificType })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: specificType,
          }),
        ])
      );
    });

    it('should sort events by timestamp', async () => {
      const response = await request(app.server)
        .get('/api/events')
        .query({ sortBy: 'timestamp', sortOrder: 'desc' })
        .expect(200);

      const timestamps = response.body.data.map((event: Event) => event.timestamp);
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b.localeCompare(a)));
    });
  });
});
