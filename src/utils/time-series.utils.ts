import { AppError, ErrorType } from './error.utils';
import { injectable } from 'tsyringe';
import type { AggregationQuery, AdvancedAnalyticsQuery } from '../schemas/event.schema';
import { parseISO, differenceInMinutes } from 'date-fns';
import { groupBy, meanBy } from 'lodash';

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d';
export type PostgresInterval = '1 minute' | '5 minutes' | '15 minutes' | '1 hour' | '1 day';

interface TimeSeriesConfig {
  readonly viewName: string;
  readonly pgInterval: PostgresInterval;
  readonly maxTimeRange: number; // in milliseconds
}

const INTERVAL_CONFIGS: Record<string, TimeSeriesConfig> = {
  '1m': {
    viewName: 'events_1m',
    pgInterval: '1 minute',
    maxTimeRange: 24 * 60 * 60 * 1000, // 24 hours
  },
  '5m': {
    viewName: 'events_5m',
    pgInterval: '5 minutes',
    maxTimeRange: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  '15m': {
    viewName: 'events_15m',
    pgInterval: '15 minutes',
    maxTimeRange: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  '1h': {
    viewName: 'events_1h',
    pgInterval: '1 hour',
    maxTimeRange: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
  '1d': {
    viewName: 'events_1d',
    pgInterval: '1 day',
    maxTimeRange: 365 * 24 * 60 * 60 * 1000, // 365 days
  },
};

/**
 * Utility class for handling time-series operations and aggregations
 */
@injectable()
export class TimeSeriesAggregator {
  private readonly VALID_INTERVALS = ['hour', 'day', 'week', 'month'] as const;

  private getConfig(interval: string): TimeSeriesConfig {
    const config = INTERVAL_CONFIGS[interval];
    if (!config) {
      throw new Error(`Invalid interval: ${interval}`);
    }
    return config;
  }

  /**
   * Validates if the time range is appropriate for the given interval
   */
  private validateTimeRangeForInterval(
    interval: TimeInterval,
    startTime: Date,
    endTime: Date
  ): void {
    const config = this.getConfig(interval.toString());
    const timeRange = endTime.getTime() - startTime.getTime();

    if (timeRange <= 0) {
      throw new AppError(ErrorType.VALIDATION, 'End time must be after start time', 400);
    }

    if (timeRange > config.maxTimeRange) {
      const maxDays = Math.floor(config.maxTimeRange / (24 * 60 * 60 * 1000));
      throw new AppError(
        ErrorType.VALIDATION,
        `Time range too large for ${interval} interval. Maximum range is ${maxDays} days.`,
        400
      );
    }
  }

  async aggregate(query: AggregationQuery): Promise<unknown> {
    const { startTime, endTime } = query;
    this.validateTimeRangeForInterval(query.interval, new Date(startTime), new Date(endTime));
    const config = this.getConfig(query.interval);

    // TODO: Implement aggregation logic using materialized views
    return {
      interval: query.interval,
      viewName: config.viewName,
      data: [],
    };
  }

  async advancedAnalytics(query: AdvancedAnalyticsQuery): Promise<unknown> {
    this.validateTimeRangeForInterval(
      query.interval,
      new Date(query.startTime),
      new Date(query.endTime)
    );

    // TODO: Implement advanced analytics logic
    return {
      groupBy: query.groupBy || [],
      metrics: query.metrics || [],
      data: [],
    };
  }

  /**
   * Gets the appropriate continuous aggregate view name based on interval
   */
  getViewName(interval: TimeInterval): string {
    return this.getConfig(interval.toString()).viewName;
  }

  /**
   * Gets the PostgreSQL interval string for the given time interval
   */
  getPostgresInterval(interval: TimeInterval): PostgresInterval {
    return this.getConfig(interval.toString()).pgInterval;
  }

  /**
   * Suggests the most appropriate interval based on the time range
   */
  suggestInterval(startTime: Date, endTime: Date): TimeInterval {
    const diffInHours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    if (diffInHours <= 24) {
      return '1h';
    } else if (diffInHours <= 24 * 7) {
      return '1d';
    } else if (diffInHours <= 24 * 30) {
      return '1d';
    } else {
      return '1d';
    }
  }

  /**
   * Generates time series buckets for the given time range
   */
  generateBuckets(startTime: Date, endTime: Date): { start: Date; end: Date }[] {
    const buckets: { start: Date; end: Date }[] = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const bucketStart = new Date(currentTime);
      let bucketEnd: Date;

      // Calculate bucket end based on interval
      const interval = this.suggestInterval(startTime, endTime);
      switch (interval) {
        case '1h':
          bucketEnd = new Date(currentTime.setHours(currentTime.getHours() + 1));
          break;
        case '1d':
          bucketEnd = new Date(currentTime.setDate(currentTime.getDate() + 1));
          break;
        default:
          bucketEnd = new Date(currentTime.setDate(currentTime.getDate() + 1));
      }

      // Ensure the last bucket doesn't exceed endTime
      if (bucketEnd > endTime) {
        bucketEnd = new Date(endTime);
      }

      buckets.push({ start: bucketStart, end: bucketEnd });
      currentTime = new Date(bucketEnd);
    }

    return buckets;
  }

  /**
   * Formats a date according to the interval
   */
  formatDate(date: Date, interval: string): string {
    switch (interval) {
      case 'hour': {
        const hourFormat = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return hourFormat.format(date);
      }
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        return `Week ${Math.ceil(date.getDate() / 7)} of ${date.toISOString().split('T')[0].slice(0, 7)}`;
      case 'month':
        return date.toISOString().slice(0, 7);
      default:
        return date.toISOString();
    }
  }
}

/**
 * Example: Calculate average event duration per user in a time window
 */
export function averageDurationPerUser(
  events: Array<{ userId: string; timestamp: string; duration: number }>,
  start: string,
  end: string
) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const filtered = events.filter(e => {
    const ts = parseISO(e.timestamp);
    return ts >= startDate && ts <= endDate;
  });
  const grouped = groupBy(filtered, 'userId');
  return Object.entries(grouped).map(([userId, userEvents]) => ({
    userId,
    avgDuration: meanBy(userEvents as { duration: number }[], 'duration'),
    eventCount: (userEvents as { duration: number }[]).length,
  }));
}
