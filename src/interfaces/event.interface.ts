import type {
  CreateEventInput,
  CreateBatchEventsInput,
  AggregationQuery,
  AdvancedAnalyticsQuery,
  RawEventsQuery,
  EventMetadata as SchemaEventMetadata,
  EventData as SchemaEventData,
} from '../schemas/event.schema';

export type { SchemaEventMetadata as EventMetadata, SchemaEventData as EventData };

export interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  data: SchemaEventData;
  userId?: string;
  sessionId?: string;
  duration?: number;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'pending' | 'processed' | 'failed' | 'archived';
  tags: string[];
  metadata?: SchemaEventMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface EventStats {
  total_events: number;
  unique_users: number;
  avg_duration: number;
  event_types: string[];
  sources: string[];
}

export interface EventPattern {
  pattern: string;
  count: number;
  percentage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Common interface for date range queries
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Event aggregation options
 */
export interface AggregationOptions extends DateRange {
  groupBy: string;
  metric: string;
}

/**
 * Advanced analytics query parameters
 */
export interface AdvancedAnalyticsOptions extends DateRange {
  dimensions?: string[];
  metrics?: string[];
  filters?: Record<string, unknown>;
}

export interface IEventService {
  createEvent(input: CreateEventInput): Promise<Event>;
  createBatchEvents(input: CreateBatchEventsInput): Promise<Event[]>;
  findRawEvents(query: RawEventsQuery): Promise<PaginatedResult<Event>>;
  getEventStats(timeRange: { start: string; end: string }): Promise<EventStats>;
  getEventPatterns(
    timeRange: { start: string; end: string },
    limit?: number
  ): Promise<EventPattern[]>;
  aggregateEvents(query: AggregationQuery): Promise<Record<string, number>>;
  getAdvancedAnalytics(query: AdvancedAnalyticsQuery): Promise<Record<string, number>>;
  deleteEvent(id: string): Promise<void>;
  archiveEvent(id: string): Promise<void>;
  reprocessEvent(id: string): Promise<void>;
}
