import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { mock } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { ExportService } from '../../services/export.service';
import { EventService } from '../../services/event.service';
import { WebhookService } from '../../services/webhook.service';
import { EventRepository } from '../../repositories/event.repository';
import { WebhookRepository } from '../../repositories/webhook.repository';
import { ExportController } from '../../controllers/export.controller';
import { TimeSeriesAggregator } from '../../utils/time-series.utils';
import type { RawEventsQuery } from '../../schemas/event.schema';

describe('ExportController', () => {
  let exportController: ExportController;
  let mockExportService: jest.Mocked<ExportService>;
  let mockEventService: jest.Mocked<EventService>;
  let mockWebhookService: jest.Mocked<WebhookService>;
  let mockEventRepository: jest.Mocked<EventRepository>;
  let mockWebhookRepository: jest.Mocked<WebhookRepository>;
  let mockTimeSeriesAggregator: jest.Mocked<TimeSeriesAggregator>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLogger: jest.Mocked<FastifyBaseLogger>;

  beforeEach(() => {
    mockExportService = mock<ExportService>();
    mockEventService = mock<EventService>();
    mockWebhookService = mock<WebhookService>();
    mockEventRepository = mock<EventRepository>();
    mockWebhookRepository = mock<WebhookRepository>();
    mockTimeSeriesAggregator = mock<TimeSeriesAggregator>();
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnThis(),
      level: 'info',
    } as unknown as jest.Mocked<FastifyBaseLogger>;
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };

    container.clearInstances();
    container.registerInstance('PrismaClient', mock());
    container.registerInstance(EventRepository, mockEventRepository);
    container.registerInstance(WebhookRepository, mockWebhookRepository);
    container.registerInstance(WebhookService, mockWebhookService);
    container.registerInstance(EventService, mockEventService);
    container.registerInstance(ExportService, mockExportService);
    container.registerInstance(TimeSeriesAggregator, mockTimeSeriesAggregator);

    exportController = container.resolve(ExportController);
  });

  describe('exportEvents', () => {
    it('should export events in JSON format', async () => {
      const exportQuery = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        format: 'json',
      };

      const jsonContent = [{ id: '1', data: 'test' }];

      mockExportService.exportRawEvents.mockResolvedValue({
        data: JSON.stringify(jsonContent),
        contentType: 'application/json',
        filename: 'events.json',
      });

      mockRequest = {
        query: exportQuery,
        log: mockLogger,
      };

      await exportController.exportEvents(
        mockRequest as FastifyRequest<{
          Querystring: RawEventsQuery & { format?: 'json' | 'csv' };
        }>,
        mockReply as FastifyReply
      );

      expect(mockExportService.exportRawEvents).toHaveBeenCalledWith(
        { start: exportQuery.startTime, end: exportQuery.endTime },
        'json'
      );
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.json')
      );
      // Parse the JSON string before comparison
      const sentData = JSON.parse((mockReply.send as jest.Mock).mock.calls[0][0]);
      expect(sentData).toEqual(jsonContent);
    });

    it('should export events in CSV format', async () => {
      const exportQuery = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        format: 'csv',
      };

      const csvContent = 'id,data\n1,test';

      mockExportService.exportRawEvents.mockResolvedValue({
        data: csvContent,
        contentType: 'text/csv',
        filename: 'events.csv',
      });

      mockRequest = {
        query: exportQuery,
        log: mockLogger,
      };

      await exportController.exportEvents(
        mockRequest as FastifyRequest<{
          Querystring: RawEventsQuery & { format?: 'json' | 'csv' };
        }>,
        mockReply as FastifyReply
      );

      expect(mockExportService.exportRawEvents).toHaveBeenCalledWith(
        { start: exportQuery.startTime, end: exportQuery.endTime },
        'csv'
      );
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv')
      );
      expect(mockReply.send).toHaveBeenCalledWith(csvContent);
    });

    it('should handle errors when exporting events', async () => {
      const exportQuery = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        format: 'json',
      };

      const error = new Error('Failed to export events');
      mockExportService.exportRawEvents.mockRejectedValue(error);

      mockRequest = {
        query: exportQuery,
        log: mockLogger,
      };

      await exportController.exportEvents(
        mockRequest as FastifyRequest<{
          Querystring: RawEventsQuery & { format?: 'json' | 'csv' };
        }>,
        mockReply as FastifyReply
      );

      expect(mockLogger.error).toHaveBeenCalledWith(error, 'Failed to export events');
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to export events',
      });
    });
  });

  describe('exportAggregatedEvents', () => {
    it('should export aggregated events successfully', async () => {
      const exportQuery = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        interval: 'day',
        format: 'json',
      };

      const jsonContent = [{ timestamp: '2024-01-01', count: 10 }];

      mockExportService.exportAggregatedEvents.mockResolvedValue({
        data: JSON.stringify(jsonContent),
        contentType: 'application/json',
        filename: 'aggregated_events.json',
      });

      mockRequest = {
        query: exportQuery,
        log: mockLogger,
      };

      await exportController.exportAggregatedEvents(
        mockRequest as FastifyRequest<{
          Querystring: {
            startTime: string;
            endTime: string;
            interval: string;
            format?: 'json' | 'csv';
          };
        }>,
        mockReply as FastifyReply
      );

      expect(mockExportService.exportAggregatedEvents).toHaveBeenCalledWith(
        { start: exportQuery.startTime, end: exportQuery.endTime },
        'json',
        { groupBy: 'timestamp', metric: 'count' }
      );
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.json')
      );
      // Parse the JSON string before comparison
      const sentData = JSON.parse((mockReply.send as jest.Mock).mock.calls[0][0]);
      expect(sentData).toEqual(jsonContent);
    });

    it('should handle errors when exporting aggregated events', async () => {
      const exportQuery = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        interval: 'day',
        format: 'json',
      };

      const error = new Error('Failed to export aggregated events');
      mockExportService.exportAggregatedEvents.mockRejectedValue(error);

      mockRequest = {
        query: exportQuery,
        log: mockLogger,
      };

      await exportController.exportAggregatedEvents(
        mockRequest as FastifyRequest<{
          Querystring: {
            startTime: string;
            endTime: string;
            interval: string;
            format?: 'json' | 'csv';
          };
        }>,
        mockReply as FastifyReply
      );

      expect(mockLogger.error).toHaveBeenCalledWith(error, 'Failed to export aggregated events');
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to export aggregated events',
      });
    });
  });
});
