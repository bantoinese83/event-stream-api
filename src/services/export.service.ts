import { Parser } from 'json2csv';
import { AppError, ErrorType } from '../utils/error.utils';
import { logger } from '../utils/logger';
import { EventService } from './event.service';
import { inject, injectable } from 'tsyringe';
import type { DateRange } from '../interfaces/event.interface';

type ExportFormat = 'json' | 'csv';
type ExportResult = {
  data: string;
  contentType: string;
  filename: string;
};

/**
 * Service for handling data exports in various formats
 */
@injectable()
export class ExportService {
  private readonly supportedFormats: readonly ExportFormat[] = ['json', 'csv'] as const;
  private readonly defaultPageSize = 1000;

  constructor(@inject(EventService) private readonly eventService: EventService) {}

  /**
   * Exports raw events within a date range
   */
  async exportRawEvents(dateRange: DateRange, format: ExportFormat): Promise<ExportResult> {
    try {
      const result = await this.eventService.findRawEvents({
        startTime: dateRange.start,
        endTime: dateRange.end,
        page: 1,
        pageSize: this.defaultPageSize,
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
      });

      return this.formatExport(result.data, format, 'raw_events');
    } catch (error) {
      logger.error('Failed to export raw events', { error, dateRange });
      throw new AppError(ErrorType.INTERNAL, 'Failed to export raw events', 500, {
        originalError: error,
      });
    }
  }

  /**
   * Exports aggregated events within a date range
   */
  async exportAggregatedEvents(
    dateRange: DateRange,
    format: ExportFormat,
    aggregation: { groupBy: string; metric: string }
  ): Promise<ExportResult> {
    try {
      const result = await this.eventService.aggregateEvents({
        startTime: dateRange.start,
        endTime: dateRange.end,
        interval: '1h',
        page: 1,
        pageSize: this.defaultPageSize,
        ...aggregation,
      });

      return this.formatExport([result], format, 'aggregated_events');
    } catch (error) {
      logger.error('Failed to export aggregated events', { error, dateRange, aggregation });
      throw new AppError(ErrorType.INTERNAL, 'Failed to export aggregated events', 500, {
        originalError: error,
      });
    }
  }

  /**
   * Formats the export data in the specified format
   */
  private formatExport(data: unknown[], format: ExportFormat, prefix: string): ExportResult {
    this.validateExportFormat(format);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.${format}`;
    const parser = new Parser();

    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(data, null, 2),
          contentType: 'application/json',
          filename,
        };
      case 'csv':
        return {
          data: parser.parse(data),
          contentType: 'text/csv',
          filename,
        };
    }
  }

  /**
   * Validates the export format
   */
  private validateExportFormat(format: string): asserts format is ExportFormat {
    if (!this.supportedFormats.includes(format as ExportFormat)) {
      throw new AppError(
        ErrorType.VALIDATION,
        `Unsupported export format. Must be one of: ${this.supportedFormats.join(', ')}`,
        400
      );
    }
  }
}
