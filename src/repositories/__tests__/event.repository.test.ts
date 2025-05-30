import { PrismaClient } from '@prisma/client';
import { EventRepository } from '../event.repository';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';

// Mock Prisma.raw
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  Prisma: {
    ...jest.requireActual('@prisma/client').Prisma,
    raw: (str: string) => str,
  },
}));

describe('EventRepository', () => {
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let eventRepository: EventRepository;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    container.clearInstances();
    container.registerInstance('PrismaClient', mockPrisma);
    eventRepository = container.resolve(EventRepository);
  });

  describe('findAggregatedEvents', () => {
    it('should create and use materialized view for aggregation', async () => {
      // Mock the raw query responses
      mockPrisma.$executeRaw.mockResolvedValueOnce(1); // For REFRESH MATERIALIZED VIEW
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          bucket: new Date('2024-01-01'),
          count: 10,
          event_type: 'type1',
          source: 'source1',
        },
        {
          bucket: new Date('2024-01-02'),
          count: 15,
          event_type: 'type2',
          source: 'source2',
        },
      ]);

      // Query aggregated events
      const result = await eventRepository.findAggregatedEvents(
        {
          startTime: new Date(2024, 0, 1).toISOString(),
          endTime: new Date(2024, 0, 31).toISOString(),
          page: 1,
          pageSize: 100,
          interval: '1d',
        },
        'event_aggregation_test',
        '1 day'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('bucket');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('event_type');
      expect(result[0]).toHaveProperty('source');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle large batch of events efficiently', async () => {
      const BATCH_SIZE = 1000;
      const mockEvents = Array.from({ length: BATCH_SIZE }, (_, i) => ({
        id: `id-${i}`,
        timestamp: new Date(),
        eventType: `type${i % 5}`,
        source: `source${i % 3}`,
        status: 'processed' as const,
        data: {
          page: 'test-page',
          userAgent: 'test-agent',
          index: i,
        },
        metadata: {
          environment: 'test',
          version: '1.0.0',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Mock the Prisma responses
      mockPrisma.event.create.mockImplementation(({ data }) => {
        const result = {
          id: 'mock-id',
          timestamp: new Date(data.timestamp),
          eventType: data.eventType,
          source: data.source,
          status: data.status || 'processed',
          data: data.data,
          metadata: data.metadata,
          userId: null,
          sessionId: null,
          duration: null,
          priority: 1,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return Promise.resolve(result) as unknown as ReturnType<typeof mockPrisma.event.create>;
      });

      mockPrisma.event.count.mockImplementation(args => {
        const where = args?.where;
        let count = BATCH_SIZE;
        if (where?.eventType === 'type0') count = BATCH_SIZE / 5;
        if (where?.source === 'source0') count = BATCH_SIZE / 3;
        return Promise.resolve(count) as unknown as ReturnType<typeof mockPrisma.event.count>;
      });

      // Create events
      const createPromises = mockEvents.map(event =>
        eventRepository.create({
          timestamp: event.timestamp.toISOString(),
          eventType: event.eventType,
          source: event.source,
          status: 'processed',
          data: event.data,
          metadata: event.metadata,
          priority: 1,
          tags: [],
        })
      );

      await Promise.all(createPromises);

      // Verify all events were created
      const count = await eventRepository.count({});
      expect(count).toBe(BATCH_SIZE);

      // Test querying with indexes
      const typeCount = await eventRepository.count({
        eventType: 'type0',
      });
      expect(typeCount).toBe(BATCH_SIZE / 5);

      const sourceCount = await eventRepository.count({
        source: 'source0',
      });
      expect(sourceCount).toBe(BATCH_SIZE / 3);
    });
  });
});
