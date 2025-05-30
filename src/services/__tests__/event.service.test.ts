import { EventService } from '../event.service';
import { EventRepository } from '../../repositories/event.repository';
import { WebhookService } from '../webhook.service';
import { AppError, ErrorType } from '../../utils/error.utils';
import { EVENT_BATCH_CHUNK_SIZE, EVENT_BATCH_MAX_CONCURRENT } from '../../config/constants';

describe('EventService', () => {
  let eventService: EventService;
  let eventRepository: jest.Mocked<EventRepository>;
  let webhookService: jest.Mocked<WebhookService>;

  beforeEach(() => {
    eventRepository = {
      create: jest.fn(),
      findRawEvents: jest.fn(),
      getEventStats: jest.fn(),
      getTopPatterns: jest.fn(),
      findAggregatedEvents: jest.fn(),
      getAdvancedAnalytics: jest.fn(),
      delete: jest.fn(),
      archive: jest.fn(),
      reprocess: jest.fn(),
      update: jest.fn(),
    } as any;
    webhookService = {
      triggerWebhooks: jest.fn().mockResolvedValue(undefined),
    } as any;
    eventService = new EventService(eventRepository as any, webhookService);
  });

  const baseEvent = {
    id: '1',
    timestamp: '2023-01-01T00:00:00Z',
    eventType: 'test',
    source: 'src',
    data: {},
    status: 'pending' as const,
    priority: 1,
    tags: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  describe('createEvent', () => {
    it('should create an event and trigger webhooks', async () => {
      (eventRepository.create as jest.Mock).mockResolvedValue(baseEvent);
      const result = await eventService.createEvent({ ...baseEvent });
      expect(result).toBe(baseEvent);
      expect(webhookService.triggerWebhooks).toHaveBeenCalledWith('event.created', baseEvent);
    });
    it('should handle repository errors', async () => {
      (eventRepository.create as jest.Mock).mockRejectedValue(
        new AppError(ErrorType.INTERNAL, 'fail', 500)
      );
      await expect(eventService.createEvent({ ...baseEvent })).rejects.toThrow('fail');
    });
  });

  describe('createBatchEvents', () => {
    it('should create events in batches and trigger webhooks', async () => {
      const events = Array.from({ length: EVENT_BATCH_CHUNK_SIZE + 1 }, (_, i) => ({
        ...baseEvent,
        id: String(i),
        status: 'pending' as const,
      }));
      (eventRepository.create as jest.Mock).mockResolvedValue(baseEvent);
      const result = await eventService.createBatchEvents({ events });
      expect(result.length).toBe(events.length);
      expect(webhookService.triggerWebhooks).toHaveBeenCalled();
    });
    it('should handle errors in batch creation and return failed status', async () => {
      (eventRepository.create as jest.Mock).mockImplementation(() => {
        throw new Error('fail');
      });
      const events = [{ ...baseEvent, status: 'pending' as const }];
      const result = await eventService.createBatchEvents({ events });
      expect(result[0].status).toBe('failed');
    });
  });

  describe('findRawEvents', () => {
    it('should return paginated events', async () => {
      (eventRepository.findRawEvents as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
      });
      const result = await eventService.findRawEvents({
        startTime: '2023-01-01',
        endTime: '2023-01-02',
        page: 1,
        pageSize: 10,
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
      });
      expect(result.data).toEqual([]);
    });
    it('should throw on repository error', async () => {
      (eventRepository.findRawEvents as jest.Mock).mockRejectedValue(
        new AppError(ErrorType.INTERNAL, 'fail', 500)
      );
      await expect(
        eventService.findRawEvents({
          startTime: '2023-01-01',
          endTime: '2023-01-02',
          page: 1,
          pageSize: 10,
          orderBy: [{ field: 'timestamp', direction: 'desc' }],
        })
      ).rejects.toThrow('fail');
    });
  });

  describe('getEventStats', () => {
    it('should return event stats', async () => {
      (eventRepository.getEventStats as jest.Mock).mockResolvedValue({} as any);
      const result = await eventService.getEventStats({ start: '2023-01-01', end: '2023-01-02' });
      expect(result).toEqual({});
    });
    it('should throw on repository error', async () => {
      (eventRepository.getEventStats as jest.Mock).mockRejectedValue(
        new AppError(ErrorType.INTERNAL, 'fail', 500)
      );
      await expect(
        eventService.getEventStats({ start: '2023-01-01', end: '2023-01-02' })
      ).rejects.toThrow('fail');
    });
  });

  describe('getEventPatterns', () => {
    it('should return event patterns', async () => {
      (eventRepository.getTopPatterns as jest.Mock).mockResolvedValue([
        {
          eventType: 'test',
          source: 'src',
          page: null,
          occurrence_count: 1,
          affected_users: [],
          affected_sessions: [],
        },
      ]);
      const result = await eventService.getEventPatterns(
        { start: '2023-01-01', end: '2023-01-02' },
        1
      );
      expect(result[0].pattern).toBe('test -> src');
    });
  });

  describe('aggregateEvents', () => {
    it('should aggregate events', async () => {
      const aggregateSpy = jest
        .spyOn((eventService as any).timeSeriesAggregator, 'aggregate')
        .mockResolvedValue({ count: 1 });
      const result = await eventService.aggregateEvents({
        startTime: '2023-01-01',
        endTime: '2023-01-02',
        interval: '1h',
        page: 1,
        pageSize: 10,
      });
      expect(result.count).toBe(1);
      aggregateSpy.mockRestore();
    });
  });

  describe('getAdvancedAnalytics', () => {
    it('should return advanced analytics', async () => {
      (eventRepository.findAggregatedEvents as jest.Mock).mockResolvedValue([
        { event_type: 'test', source: 'src', bucket: new Date('2023-01-01T00:00:00Z'), count: 42 },
      ]);
      const result = await eventService.getAdvancedAnalytics({
        startTime: '2023-01-01',
        endTime: '2023-01-02',
        metrics: ['count'],
        interval: '1h',
        page: 1,
        pageSize: 10,
      });
      const key = 'test_src_2023-01-01T00:00:00.000Z';
      expect(result[key]).toBe(42);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      (eventRepository.delete as jest.Mock).mockResolvedValue(undefined);
      await expect(eventService.deleteEvent('id')).resolves.toBeUndefined();
    });
  });

  describe('archiveEvent', () => {
    it('should archive an event', async () => {
      ((eventRepository as any).archive as jest.Mock).mockResolvedValue(undefined);
      await expect(eventService.archiveEvent('id')).resolves.toBeUndefined();
    });
  });

  describe('reprocessEvent', () => {
    it('should reprocess an event', async () => {
      ((eventRepository as any).reprocess as jest.Mock).mockResolvedValue(undefined);
      await expect(eventService.reprocessEvent('id')).resolves.toBeUndefined();
    });
  });
});
