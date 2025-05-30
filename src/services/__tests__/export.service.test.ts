import { ExportService } from '../export.service';
import { AppError, ErrorType } from '../../utils/error.utils';
import { EventService } from '../event.service';

describe('ExportService', () => {
  let exportService: ExportService;
  let eventService: jest.Mocked<EventService>;

  beforeEach(() => {
    eventService = {
      findRawEvents: jest.fn(),
      aggregateEvents: jest.fn(),
    } as any;
    exportService = new ExportService(eventService);
  });

  it('should export raw events as JSON', async () => {
    eventService.findRawEvents.mockResolvedValue({
      data: [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          eventType: 'test',
          source: 'web',
          data: {},
          priority: 1,
          status: 'pending',
          tags: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      hasMore: false,
    });
    const result = await exportService.exportRawEvents(
      { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
      'json'
    );
    expect(result.contentType).toBe('application/json');
    expect(result.filename).toMatch(/raw_events_.*\.json/);
    expect(result.data).toContain('eventType');
  });

  it('should export raw events as CSV', async () => {
    eventService.findRawEvents.mockResolvedValue({
      data: [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          eventType: 'test',
          source: 'web',
          data: {},
          priority: 1,
          status: 'pending',
          tags: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      hasMore: false,
    });
    const result = await exportService.exportRawEvents(
      { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
      'csv'
    );
    expect(result.contentType).toBe('text/csv');
    expect(result.filename).toMatch(/raw_events_.*\.csv/);
    expect(result.data).toContain('eventType');
  });

  it('should export aggregated events as JSON', async () => {
    eventService.aggregateEvents.mockResolvedValue({ count: 42 });
    const result = await exportService.exportAggregatedEvents(
      { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
      'json',
      { groupBy: 'type', metric: 'count' }
    );
    expect(result.contentType).toBe('application/json');
    expect(result.filename).toMatch(/aggregated_events_.*\.json/);
    expect(result.data).toContain('count');
  });

  it('should throw on unsupported export format', async () => {
    await expect(
      exportService.exportRawEvents(
        { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
        'xml' as unknown as any
      )
    ).rejects.toThrow(AppError);
    try {
      await exportService.exportRawEvents(
        { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
        'xml' as unknown as any
      );
    } catch (e) {
      const err = e as AppError;
      expect(err.type).toBe(ErrorType.INTERNAL);
    }
  });

  it('should handle errors from eventService in exportRawEvents', async () => {
    eventService.findRawEvents.mockRejectedValue(new Error('fail'));
    await expect(
      exportService.exportRawEvents(
        { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
        'json'
      )
    ).rejects.toThrow(AppError);
  });

  it('should handle errors from eventService in exportAggregatedEvents', async () => {
    eventService.aggregateEvents.mockRejectedValue(new Error('fail'));
    await expect(
      exportService.exportAggregatedEvents(
        { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
        'json',
        { groupBy: 'type', metric: 'count' }
      )
    ).rejects.toThrow(AppError);
  });
});
