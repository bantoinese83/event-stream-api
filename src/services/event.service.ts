import { inject, injectable } from 'tsyringe';
import type {
  CreateEventInput,
  CreateBatchEventsInput,
  AggregationQuery,
  AdvancedAnalyticsQuery,
  RawEventsQuery,
} from '../schemas/event.schema';
import type {
  IEventService,
  Event,
  EventStats,
  EventPattern,
  PaginatedResult,
} from '../interfaces/event.interface';
import { WebhookService } from './webhook.service';
import { TimeSeriesAggregator } from '../utils/time-series.utils';
import { validateDateRange, validateBatchSize } from '../utils/validation.utils';
import { handlePrismaError } from '../utils/error.utils';
import { MonitorPerformance } from '../utils/performance.utils';
import { logger } from '../utils/logger';
import { EventRepository } from '../repositories/event.repository';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { EVENT_BATCH_CHUNK_SIZE, EVENT_BATCH_MAX_CONCURRENT } from '../config/constants';
import { AppError, ErrorType } from '../utils/error.utils';

/**
 * Service for handling event-related operations
 */
@injectable()
export class EventService implements IEventService {
  constructor(
    @inject(EventRepository) private readonly eventRepository: EventRepository,
    @inject(WebhookService) private readonly webhookService: WebhookService,
    private readonly timeSeriesAggregator = new TimeSeriesAggregator()
  ) {}

  /**
   * Creates a new event
   * @param input - The event input
   * @returns The created event
   */
  @MonitorPerformance()
  async createEvent(input: CreateEventInput): Promise<Event> {
    try {
      const event = await this.eventRepository.create({
        ...input,
        timestamp: input.timestamp || new Date().toISOString(),
      });

      // Trigger webhooks asynchronously
      if (event.id) {
        this.webhookService.triggerWebhooks('event.created', event).catch(error => {
          logger.error('Failed to trigger webhooks', { error, eventId: event.id });
        });
      }

      return event;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Creates multiple events in a batch with optimized chunking and parallel processing
   * @param input - The batch event input
   * @returns Array of created events
   */
  @MonitorPerformance()
  async createBatchEvents(input: CreateBatchEventsInput): Promise<Event[]> {
    validateBatchSize(input.events.length);

    try {
      // Chunk the events into smaller batches for parallel processing
      const CHUNK_SIZE = EVENT_BATCH_CHUNK_SIZE;
      const chunks = [];
      for (let i = 0; i < input.events.length; i += CHUNK_SIZE) {
        chunks.push(input.events.slice(i, i + CHUNK_SIZE));
      }

      // Process chunks in parallel with concurrency control
      const MAX_CONCURRENT = EVENT_BATCH_MAX_CONCURRENT;
      const results = [];
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
        const chunkPromises = chunks.slice(i, i + MAX_CONCURRENT).map(chunk =>
          Promise.all(
            chunk.map(async event => {
              try {
                return await this.eventRepository.create({
                  ...event,
                  timestamp: event.timestamp || new Date().toISOString(),
                });
              } catch (error) {
                logger.error('Failed to create event in batch', { error, event });
                return {
                  ...event,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error',
                  id: '', // Placeholder ID for failed events
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  severity: 'error',
                } as Event;
              }
            })
          )
        );

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.flat());
      }

      // Trigger webhooks asynchronously for successful events
      const successfulEvents = results.filter(event => event.status !== 'failed');
      await Promise.all(
        successfulEvents.map(event =>
          this.webhookService.triggerWebhooks('event.created', event).catch(error => {
            logger.error('Failed to trigger webhooks', { error, eventId: event.id });
          })
        )
      );

      return results;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw new AppError(
        ErrorType.INTERNAL,
        `Failed to create batch events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Gets raw events with pagination
   * @param query - The query parameters
   * @returns Paginated result of events
   */
  @MonitorPerformance()
  async findRawEvents(query: RawEventsQuery): Promise<PaginatedResult<Event>> {
    validateDateRange(new Date(query.startTime), new Date(query.endTime));

    try {
      return await this.eventRepository.findRawEvents(query);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Gets event statistics for a time range
   * @param timeRange - The time range for stats
   * @returns Event statistics
   */
  @MonitorPerformance()
  async getEventStats(timeRange: { start: string; end: string }): Promise<EventStats> {
    validateDateRange(new Date(timeRange.start), new Date(timeRange.end));

    try {
      return await this.eventRepository.getEventStats({
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Gets event patterns for a time range
   * @param timeRange - The time range for patterns
   * @param limit - The maximum number of patterns
   * @returns Array of event patterns
   */
  @MonitorPerformance()
  async getEventPatterns(
    timeRange: { start: string; end: string },
    limit = 10
  ): Promise<EventPattern[]> {
    validateDateRange(new Date(timeRange.start), new Date(timeRange.end));

    try {
      const patterns = await this.eventRepository.getTopPatterns(
        {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end),
        },
        limit
      );

      return patterns.map(pattern => ({
        pattern: `${pattern.eventType} -> ${pattern.source}${pattern.page ? ` -> ${pattern.page}` : ''}`,
        count: pattern.occurrence_count,
        percentage:
          pattern.affected_users.length > 0
            ? pattern.occurrence_count / pattern.affected_users.length
            : 0,
      }));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Gets aggregated events with time series bucketing
   */
  @MonitorPerformance()
  async aggregateEvents(query: AggregationQuery): Promise<Record<string, number>> {
    validateDateRange(new Date(query.startTime), new Date(query.endTime));

    try {
      const result = await this.timeSeriesAggregator.aggregate(query);
      return result as Record<string, number>;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Gets advanced analytics for events
   */
  @MonitorPerformance()
  async getAdvancedAnalytics(query: AdvancedAnalyticsQuery): Promise<Record<string, number>> {
    validateDateRange(new Date(query.startTime), new Date(query.endTime));

    try {
      const results = await this.eventRepository.findAggregatedEvents(
        query,
        'event_analytics',
        '1 hour'
      );

      // Transform array of results into a Record<string, number>
      return results.reduce(
        (acc, result) => {
          const key = `${result.event_type}_${result.source}_${result.bucket.toISOString()}`;
          acc[key] = result.count;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Deletes an event
   */
  @MonitorPerformance()
  async deleteEvent(id: string): Promise<void> {
    try {
      await this.eventRepository.delete(id);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Archives an event
   */
  @MonitorPerformance()
  async archiveEvent(id: string): Promise<void> {
    try {
      await this.eventRepository.update(id, { status: 'archived' });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Reprocesses a failed event
   */
  @MonitorPerformance()
  async reprocessEvent(id: string): Promise<void> {
    try {
      await this.eventRepository.update(id, { status: 'pending' });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }
}
