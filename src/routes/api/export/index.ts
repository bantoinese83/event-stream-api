import { FastifyPluginAsync } from 'fastify';
import { ExportController } from '../../../controllers/export.controller';
import { rawEventsQuerySchema } from '../../../schemas/event.schema';
import { z } from 'zod';
import { container } from 'tsyringe';

const exportRoutes: FastifyPluginAsync = async fastify => {
  const controller = container.resolve(ExportController);
  // Export raw events
  fastify.get('/events', {
    schema: {
      querystring: rawEventsQuerySchema.extend({
        format: z.enum(['json', 'csv']).default('json'),
      }),
      response: {
        200: {
          type: 'string',
          description: 'Raw event data in JSON or CSV format',
        },
      },
    },
    handler: controller.exportEvents.bind(controller),
  });

  // Export aggregated events
  fastify.get('/aggregated', {
    schema: {
      querystring: z.object({
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        interval: z.enum(['1m', '5m', '15m', '1h', '1d']),
        format: z.enum(['json', 'csv']).default('json'),
      }),
      response: {
        200: {
          type: 'string',
          description: 'Aggregated event data in JSON or CSV format',
        },
      },
    },
    handler: controller.exportAggregatedEvents.bind(controller),
  });
};

export default exportRoutes;
