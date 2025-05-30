import { z } from 'zod';

// Constants
const _EVENT_STATUSES = ['pending', 'processed', 'failed', 'archived'] as const;
const _EVENT_SOURCES = ['web', 'mobile', 'api', 'system'] as const;

// Common validation constants
const MAX_STRING_LENGTH = 255;
const MAX_TAGS = 10;
const VALID_STATUSES = ['pending', 'processed', 'failed', 'archived'] as const;

// Pagination schema
const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// Event metadata schema
export const eventMetadataSchema = z
  .object({
    version: z.string().optional(),
    environment: z.string().optional(),
  })
  .catchall(z.unknown());

// Event data schema
export const eventDataSchema = z
  .object({
    page: z.string().optional(),
    userAgent: z.string().optional(),
    country: z.string().optional(),
    device: z.string().optional(),
  })
  .catchall(z.unknown());

// Base event fields schema
const eventBaseFields = {
  timestamp: z.string().datetime(),
  eventType: z.string().max(MAX_STRING_LENGTH),
  source: z.string().max(MAX_STRING_LENGTH),
  data: eventDataSchema,
  userId: z.string().max(MAX_STRING_LENGTH).optional(),
  sessionId: z.string().max(MAX_STRING_LENGTH).optional(),
  duration: z.number().nonnegative().optional(),
  priority: z.number().int().min(1).max(5).default(1),
  status: z.enum(VALID_STATUSES).default('pending'),
  tags: z.array(z.string().max(MAX_STRING_LENGTH)).max(MAX_TAGS).default([]),
  metadata: eventMetadataSchema.optional(),
};

// Schema for creating events
export const createEventSchema = z.object(eventBaseFields);

// Schema for batch event creation
export const createBatchEventsSchema = z.object({
  events: z.array(z.object(eventBaseFields)).min(1).max(1000),
});

// Schema for event responses
export const eventResponseSchema = z.object({
  id: z.string().uuid(),
  ...eventBaseFields,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Enhanced aggregation query schema
export const aggregationQuerySchema = z.object({
  ...paginationSchema.shape,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  interval: z.enum(['1m', '5m', '15m', '1h', '1d']),
  eventType: z.string().optional(),
  source: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minPriority: z.number().min(1).max(5).optional(),
  status: z.enum(VALID_STATUSES).optional(),
});

// Raw events query schema with validation
export const rawEventsQuerySchema = z.object({
  ...paginationSchema.shape,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  eventType: z.string().optional(),
  source: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minPriority: z.number().min(1).max(5).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  orderBy: z
    .array(
      z.object({
        field: z.enum(['timestamp', 'eventType', 'source', 'priority', 'status']),
        direction: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .optional()
    .default([{ field: 'timestamp', direction: 'desc' }]),
});

// Advanced analytics schema with comprehensive metrics
export const advancedAnalyticsSchema = z.object({
  ...aggregationQuerySchema.shape,
  groupBy: z
    .array(
      z.enum([
        'eventType',
        'source',
        'userId',
        'sessionId',
        'priority',
        'status',
        'tags',
        'data.page',
        'data.userAgent',
        'data.country',
        'data.device',
      ])
    )
    .optional(),
  metrics: z
    .array(
      z.enum([
        'count',
        'unique_sources',
        'unique_users',
        'unique_sessions',
        'avg_duration',
        'min_duration',
        'max_duration',
        'dominant_status',
        'unique_tags',
        'p50_duration',
        'p90_duration',
        'p95_duration',
        'p99_duration',
      ])
    )
    .optional(),
  having: z.record(z.any()).optional(),
  orderBy: z
    .array(
      z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .optional(),
});

// Export types directly from Zod schemas
export type EventMetadata = z.infer<typeof eventMetadataSchema>;
export type EventData = z.infer<typeof eventDataSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateBatchEventsInput = z.infer<typeof createBatchEventsSchema>;
export type EventResponse = z.infer<typeof eventResponseSchema>;
export type AggregationQuery = z.infer<typeof aggregationQuerySchema>;
export type AdvancedAnalyticsQuery = z.infer<typeof advancedAnalyticsSchema>;
export type RawEventsQuery = z.infer<typeof rawEventsQuerySchema>;

// Validation helper with built-in error handling
export function validateDateRange(startTime: Date, endTime: Date): void {
  if (endTime < startTime) {
    throw new Error('End time must be after start time');
  }
  const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
  if (endTime.getTime() - startTime.getTime() > maxRangeMs) {
    throw new Error('Date range cannot exceed 90 days');
  }
}
