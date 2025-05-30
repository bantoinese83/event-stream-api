import { FastifyRequest, FastifyReply } from 'fastify';
import { injectable } from 'tsyringe';
import { ExportService } from '../services/export.service';
import type { RawEventsQuery } from '../schemas/event.schema';

@injectable()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  async exportEvents(
    request: FastifyRequest<{
      Querystring: RawEventsQuery & { format?: 'json' | 'csv' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { format = 'json', startTime, endTime } = request.query;
      const data = await this.exportService.exportRawEvents(
        { start: startTime, end: endTime },
        format
      );

      const filename = `events_${startTime.split('T')[0]}_${endTime.split('T')[0]}`;
      const extension = format === 'csv' ? 'csv' : 'json';

      reply.header('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      reply.header('Content-Disposition', `attachment; filename=${filename}.${extension}`);
      return reply.send(data.data);
    } catch (error) {
      request.log.error(error, 'Failed to export events');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export events',
      });
    }
  }

  async exportAggregatedEvents(
    request: FastifyRequest<{
      Querystring: {
        startTime: string;
        endTime: string;
        interval: string;
        format?: 'json' | 'csv';
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { startTime, endTime, format = 'json' } = request.query;
      const data = await this.exportService.exportAggregatedEvents(
        { start: startTime, end: endTime },
        format,
        { groupBy: 'timestamp', metric: 'count' }
      );

      const filename = `aggregated_events_${startTime.split('T')[0]}_${endTime.split('T')[0]}`;
      const extension = format === 'csv' ? 'csv' : 'json';

      reply.header('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      reply.header('Content-Disposition', `attachment; filename=${filename}.${extension}`);
      return reply.send(data.data);
    } catch (error) {
      request.log.error(error, 'Failed to export aggregated events');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export aggregated events',
      });
    }
  }
}
