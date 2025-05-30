import 'reflect-metadata';
import { FastifyRequest, FastifyReply } from 'fastify';
import { mock } from 'jest-mock-extended';
import { EventController } from '../event.controller';
import { EventService } from '../../services/event.service';
import { AppError, ErrorType } from '../../utils/error.utils';
import type { CreateEventInput, RawEventsQuery } from '../../schemas/event.schema';
import type { Event } from '../../interfaces/event.interface';
import { EventDto } from '../../dto/event.dto';

describe('EventController', () => {
  let eventController: EventController;
  let mockEventService: jest.Mocked<EventService>;
  let mockResponse: FastifyReply;

  beforeEach(() => {
    mockEventService = mock<EventService>();
    eventController = new EventController(mockEventService);
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;
  });

  describe('createSingleEvent', () => {
    it('should create an event successfully', async () => {
      const eventData: CreateEventInput = {
        timestamp: new Date().toISOString(),
        eventType: 'test',
        source: 'test',
        data: { test: 'data' },
        status: 'pending',
        priority: 1,
        tags: [],
      };

      const mockRequest = {
        body: eventData,
      } as unknown as FastifyRequest<{
        Body: CreateEventInput;
      }>;

      const mockEvent: Event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: eventData.timestamp,
        eventType: eventData.eventType,
        source: eventData.source,
        data: eventData.data,
        priority: 1,
        status: 'pending',
        tags: eventData.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: undefined,
        sessionId: undefined,
        duration: undefined,
        metadata: undefined,
      };

      mockEventService.createEvent.mockResolvedValue(mockEvent);

      await eventController.createSingleEvent(mockRequest, mockResponse);

      expect(mockEventService.createEvent).toHaveBeenCalledWith(eventData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.send).toHaveBeenCalledWith(EventDto.parseResponse(mockEvent));
    });

    it('should handle errors appropriately', async () => {
      const eventData: CreateEventInput = {
        timestamp: new Date().toISOString(),
        eventType: 'test',
        source: 'test',
        data: { test: 'data' },
        status: 'pending',
        priority: 1,
        tags: [],
      };

      const mockRequest = {
        body: eventData,
      } as unknown as FastifyRequest<{
        Body: CreateEventInput;
      }>;

      const error = new AppError(ErrorType.VALIDATION, 'Invalid event data', 400);
      mockEventService.createEvent.mockRejectedValue(error);

      await eventController.createSingleEvent(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        statusCode: 400,
        error: ErrorType.VALIDATION,
        message: 'Invalid event data',
      });
    });
  });

  describe('queryRawEvents', () => {
    it('should return events successfully', async () => {
      const queryParams: RawEventsQuery = {
        page: 1,
        pageSize: 10,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
      };

      const mockRequest = {
        query: queryParams,
      } as unknown as FastifyRequest<{
        Querystring: RawEventsQuery;
      }>;

      mockEventService.findRawEvents.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false,
      });

      await eventController.queryRawEvents(mockRequest, mockResponse);

      expect(mockEventService.findRawEvents).toHaveBeenCalledWith(queryParams);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should handle errors appropriately', async () => {
      const queryParams: RawEventsQuery = {
        page: 1,
        pageSize: 10,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
      };

      const mockRequest = {
        query: queryParams,
      } as unknown as FastifyRequest<{
        Querystring: RawEventsQuery;
      }>;

      const error = new AppError(ErrorType.INTERNAL, 'Database error', 500);
      mockEventService.findRawEvents.mockRejectedValue(error);

      await eventController.queryRawEvents(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        statusCode: 500,
        error: ErrorType.INTERNAL,
        message: 'Database error',
      });
    });
  });
});
