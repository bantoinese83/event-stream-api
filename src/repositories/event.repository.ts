import { PrismaClient, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { injectable, inject } from 'tsyringe';
import type {
  Event,
  EventStats,
  EventPattern,
  PaginatedResult,
} from '../interfaces/event.interface';
import type { CreateEventInput, RawEventsQuery, AggregationQuery } from '../schemas/event.schema';
import { buildWhereClause } from '../utils/query.utils';

@injectable()
export class EventRepository extends BaseRepository<Event, CreateEventInput> {
  constructor(@inject('PrismaClient') prisma: PrismaClient) {
    super(prisma, 'event');
  }

  async findRawEvents(query: RawEventsQuery): Promise<PaginatedResult<Event>> {
    const where = buildWhereClause(query);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: query.orderBy?.map(order => ({
          [order.field]: order.direction,
        })) || [{ timestamp: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        eventType: event.eventType,
        source: event.source,
        data: event.data as Event['data'],
        userId: event.userId ?? undefined,
        sessionId: event.sessionId ?? undefined,
        duration: event.duration ?? undefined,
        priority: 1,
        status: event.status as Event['status'],
        tags: [],
        metadata: event.metadata as Event['metadata'],
        createdAt: event.createdAt.toISOString(),
        updatedAt: (() => {
          const val = 'updatedAt' in event && event.updatedAt ? event.updatedAt : event.createdAt;
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'string') return val;
          return '';
        })(),
      })) as Event[],
      total,
      page: query.page,
      limit: query.pageSize,
      hasMore: total > query.page * query.pageSize,
    };
  }

  async findAggregatedEvents(
    query: AggregationQuery,
    viewName: string,
    pgInterval: string
  ): Promise<Array<{ bucket: Date; count: number; event_type: string; source: string }>> {
    // Use materialized view for better performance on large datasets
    await this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW IF EXISTS ${Prisma.raw(viewName)}`;

    return await this.prisma.$queryRaw`
      /*+ BitmapScan(${Prisma.raw(viewName)}) */
      SELECT 
        time_bucket(${pgInterval}::interval, timestamp) as bucket,
        COUNT(*) as count,
        event_type,
        source
      FROM ${Prisma.raw(viewName)}
      WHERE timestamp >= ${query.startTime}
        AND timestamp <= ${query.endTime}
      GROUP BY bucket, event_type, source
      ORDER BY bucket DESC
    `;
  }

  /**
   * Creates or updates the materialized view for event aggregation
   */
  async createEventAggregationView(viewName: string): Promise<void> {
    await this.prisma.$executeRaw`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${Prisma.raw(viewName)} AS
      SELECT 
        timestamp,
        eventType as event_type,
        source,
        status,
        severity,
        duration
      FROM "Event"
      WITH DATA;

      CREATE UNIQUE INDEX IF NOT EXISTS ${Prisma.raw(`${viewName}_timestamp_idx`)}
      ON ${Prisma.raw(viewName)} (timestamp);

      CREATE INDEX IF NOT EXISTS ${Prisma.raw(`${viewName}_event_type_idx`)}
      ON ${Prisma.raw(viewName)} (event_type);

      CREATE INDEX IF NOT EXISTS ${Prisma.raw(`${viewName}_source_idx`)}
      ON ${Prisma.raw(viewName)} (source);
    `;
  }

  async countDistinct(
    field: keyof Event,
    timeRange: { start: string; end: string }
  ): Promise<number> {
    const result = await this.prisma.event.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      distinct: [field as Prisma.EventScalarFieldEnum],
    });
    return result.length;
  }

  async avgDuration(timeRange: { start: string; end: string }): Promise<number> {
    const result = await this.prisma.event.aggregate({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
        duration: { not: null },
      },
      _avg: {
        duration: true,
      },
    });
    return result._avg.duration || 0;
  }

  async statusBreakdown(timeRange: {
    start: string;
    end: string;
  }): Promise<Record<string, number>> {
    const results = await this.prisma.event.groupBy({
      by: ['status'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
    });

    return results.reduce(
      (acc: Record<string, number>, curr: { status: string; _count: number }) => {
        acc[curr.status] = curr._count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  async topEventTypes(timeRange: {
    start: string;
    end: string;
  }): Promise<Array<{ eventType: string; count: number }>> {
    const results = await this.prisma.event.groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
      take: 10,
    });

    return results.map((result: { eventType: string; _count: number }) => ({
      eventType: result.eventType,
      count: result._count,
    }));
  }

  async findPatterns(
    timeRange: { start: string; end: string },
    limit: number
  ): Promise<EventPattern[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        pattern: string[];
        frequency: number;
        avg_duration: number;
        user_count: number;
      }>
    >`
      WITH event_sequences AS (
        SELECT
          array_agg(eventType ORDER BY timestamp) as pattern,
          COUNT(*) as frequency,
          AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration,
          COUNT(DISTINCT userId) as user_count
        FROM "Event"
        WHERE timestamp >= ${timeRange.start}
          AND timestamp <= ${timeRange.end}
        GROUP BY userId, sessionId
        HAVING COUNT(*) >= 2
      )
      SELECT *
      FROM event_sequences
      ORDER BY frequency DESC
      LIMIT ${limit}
    `;

    return results.map(result => ({
      pattern: result.pattern.join(' -> '),
      count: result.frequency,
      percentage: 0, // Calculate percentage if needed
    }));
  }

  async getEventStats(timeRange: { start: Date; end: Date }): Promise<EventStats> {
    const result = await this.prisma.$queryRaw<
      Array<{
        total_events: number;
        unique_users: number;
        unique_sessions: number;
        avg_duration: number;
        event_types: string[];
        sources: string[];
      }>
    >`
      SELECT
        count(*) as total_events,
        count(DISTINCT userId) as unique_users,
        count(DISTINCT sessionId) as unique_sessions,
        avg(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration,
        array_agg(DISTINCT eventType) as event_types,
        array_agg(DISTINCT source) as sources
      FROM "Event"
      WHERE timestamp >= ${timeRange.start}
        AND timestamp <= ${timeRange.end}
    `;
    return result[0] as EventStats;
  }

  async getTopPatterns(
    timeRange: { start: Date; end: Date },
    limit: number
  ): Promise<
    Array<{
      eventType: string;
      source: string;
      page: string | null;
      occurrence_count: number;
      affected_users: string[];
      affected_sessions: string[];
    }>
  > {
    return await this.prisma.$queryRaw`
      WITH event_patterns AS (
        SELECT
          eventType,
          source,
          data->>'page' as page,
          count(*) as occurrence_count,
          array_agg(DISTINCT userId) as affected_users,
          array_agg(DISTINCT sessionId) as affected_sessions
        FROM "Event"
        WHERE timestamp >= ${timeRange.start}
          AND timestamp <= ${timeRange.end}
        GROUP BY eventType, source, data->>'page'
      )
      SELECT *
      FROM event_patterns
      ORDER BY occurrence_count DESC
      LIMIT ${limit}
    `;
  }
}
