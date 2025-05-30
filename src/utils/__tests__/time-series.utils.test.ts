import 'reflect-metadata';
import { TimeSeriesAggregator } from '../time-series.utils';
import type { TimeInterval } from '../time-series.utils';

describe('TimeSeriesAggregator', () => {
  let timeSeriesAggregator: TimeSeriesAggregator;

  beforeEach(() => {
    timeSeriesAggregator = new TimeSeriesAggregator();
  });

  describe('validateTimeRangeForInterval', () => {
    it('should throw error for invalid time range', () => {
      const startTime = new Date('2024-01-31T00:00:00Z');
      const endTime = new Date('2024-01-01T00:00:00Z');
      expect(() => {
        timeSeriesAggregator['validateTimeRangeForInterval']('1h', startTime, endTime);
      }).toThrow('End time must be after start time');
    });

    it('should throw error for time range too large', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-12-31T23:59:59Z');
      expect(() => {
        timeSeriesAggregator['validateTimeRangeForInterval']('1h', startTime, endTime);
      }).toThrow('Time range too large for 1h interval');
    });

    it('should not throw for valid time range', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');
      expect(() => {
        timeSeriesAggregator['validateTimeRangeForInterval']('1h', startTime, endTime);
      }).not.toThrow();
    });
  });

  describe('suggestInterval', () => {
    it('should suggest 1h for time range within 24 hours', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      const result = timeSeriesAggregator.suggestInterval(startTime, endTime);
      expect(result).toBe('1h');
    });

    it('should suggest 1d for time range over 24 hours', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-08T00:00:00Z');
      const result = timeSeriesAggregator.suggestInterval(startTime, endTime);
      expect(result).toBe('1d');
    });
  });

  describe('getViewName', () => {
    it('should return correct view name for interval', () => {
      expect(timeSeriesAggregator.getViewName('1m')).toBe('events_1m');
      expect(timeSeriesAggregator.getViewName('1h')).toBe('events_1h');
      expect(timeSeriesAggregator.getViewName('1d')).toBe('events_1d');
    });

    it('should throw error for invalid interval', () => {
      expect(() => timeSeriesAggregator.getViewName('invalid' as TimeInterval)).toThrow(
        'Invalid interval'
      );
    });
  });

  describe('getPostgresInterval', () => {
    it('should return correct postgres interval string', () => {
      expect(timeSeriesAggregator.getPostgresInterval('1m')).toBe('1 minute');
      expect(timeSeriesAggregator.getPostgresInterval('1h')).toBe('1 hour');
      expect(timeSeriesAggregator.getPostgresInterval('1d')).toBe('1 day');
    });
  });

  describe('generateBuckets', () => {
    it('should generate hourly buckets for 24-hour range', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      const buckets = timeSeriesAggregator.generateBuckets(startTime, endTime);
      expect(buckets.length).toBe(24);
      expect(buckets[0].start).toEqual(startTime);
      expect(buckets[buckets.length - 1].end).toEqual(endTime);
    });
  });

  describe('formatDate', () => {
    it('should format date for hourly interval', () => {
      const date = new Date('2024-01-01T15:30:00Z');
      const result = timeSeriesAggregator.formatDate(date, 'hour');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format date for daily interval', () => {
      const date = new Date('2024-01-01T15:30:00Z');
      const result = timeSeriesAggregator.formatDate(date, 'day');
      expect(result).toBe('2024-01-01');
    });

    it('should format date for monthly interval', () => {
      const date = new Date('2024-01-01T15:30:00Z');
      const result = timeSeriesAggregator.formatDate(date, 'month');
      expect(result).toBe('2024-01');
    });
  });
});
