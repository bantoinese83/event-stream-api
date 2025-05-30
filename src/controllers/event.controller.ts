import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, injectable } from 'tsyringe';
import { EventService } from '../services/event.service';
import { AppError, formatErrorResponse } from '../utils/error.utils';
import { logger } from '../utils/logger';
import { PerformanceMetrics } from '../utils/performance.utils';
import type {
  AggregationQuery,
  AdvancedAnalyticsQuery,
  RawEventsQuery,
} from '../schemas/event.schema';
import { EventDto } from '../dto/event.dto';

const metrics = new PerformanceMetrics();

@injectable()
export class EventController {
  constructor(@inject(EventService) private readonly eventService: EventService) {}

  @metrics.measure()
  async createSingleEvent(request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) {
    try {
      const dto = EventDto.parseCreate(request.body);
      const event = await this.eventService.createEvent(dto);
      logger.info('Event created successfully', { eventId: event.id });
      const response = EventDto.parseResponse(event);
      return reply.status(201).send(response);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to create event', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async createBatchEvents(request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) {
    try {
      const dto = EventDto.parseBatch(request.body);
      const results = await this.eventService.createBatchEvents(dto);

      const successCount = results.filter(r => r.status !== 'failed').length;
      const failureCount = results.length - successCount;

      logger.info('Batch events processed', {
        total: results.length,
        success: successCount,
        failed: failureCount,
      });

      return reply.status(201).send({
        results,
        summary: { total: results.length, success: successCount, failed: failureCount },
      });
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to process batch events', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async queryRawEvents(
    request: FastifyRequest<{ Querystring: RawEventsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const events = await this.eventService.findRawEvents(request.query);
      return reply.send(events);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to query raw events', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async getAggregatedMetrics(
    request: FastifyRequest<{ Querystring: AggregationQuery }>,
    reply: FastifyReply
  ) {
    try {
      const aggregation = await this.eventService.aggregateEvents(request.query);
      return reply.send(aggregation);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to get aggregated metrics', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async getEventStatistics(
    request: FastifyRequest<{
      Querystring: { startTime: string; endTime: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { startTime, endTime } = request.query;
      const stats = await this.eventService.getEventStats({
        start: startTime,
        end: endTime,
      });
      return reply.send(stats);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to get event statistics', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async getAdvancedAnalytics(
    request: FastifyRequest<{ Querystring: AdvancedAnalyticsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.eventService.getAdvancedAnalytics(request.query);
      return reply.send(result);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to perform advanced analytics', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }

  @metrics.measure()
  async getTopPatterns(
    request: FastifyRequest<{
      Querystring: {
        startTime: string;
        endTime: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { startTime, endTime, limit } = request.query;
      const result = await this.eventService.getEventPatterns(
        {
          start: startTime,
          end: endTime,
        },
        limit ? parseInt(limit, 10) : undefined
      );
      return reply.send(result);
    } catch (error) {
      const err = error as Error | AppError;
      logger.error('Failed to get top patterns', { error: err.message });
      return reply
        .status(err instanceof AppError ? err.statusCode : 500)
        .send(formatErrorResponse(err));
    }
  }
}
