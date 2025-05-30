import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { EventController } from '../../../controllers/event.controller';
import {
  createEventSchema,
  createBatchEventsSchema,
  aggregationQuerySchema,
  advancedAnalyticsSchema,
  rawEventsQuerySchema,
} from '../../../schemas/event.schema';

const events: FastifyPluginAsync = async fastify => {
  const controller = container.resolve(EventController);

  // Create single event
  fastify.post('/', {
    schema: {
      body: createEventSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            timestamp: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            data: { type: 'object' },
            userId: { type: 'string' },
            sessionId: { type: 'string' },
            duration: { type: 'number' },
            priority: { type: 'number' },
            status: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    handler: controller.createSingleEvent.bind(controller),
  });

  // Create batch events
  fastify.post('/batch', {
    schema: {
      body: createBatchEventsSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  timestamp: { type: 'string' },
                  eventType: { type: 'string' },
                  source: { type: 'string' },
                  data: { type: 'object' },
                  userId: { type: 'string' },
                  sessionId: { type: 'string' },
                  duration: { type: 'number' },
                  priority: { type: 'number' },
                  status: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  error: { type: 'string', nullable: true },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                success: { type: 'number' },
                failed: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: controller.createBatchEvents.bind(controller),
  });

  // Get raw events
  fastify.get('/raw', {
    schema: {
      querystring: rawEventsQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  timestamp: { type: 'string' },
                  eventType: { type: 'string' },
                  source: { type: 'string' },
                  data: { type: 'object' },
                  userId: { type: 'string' },
                  sessionId: { type: 'string' },
                  duration: { type: 'number' },
                  priority: { type: 'number' },
                  status: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                pageSize: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: controller.queryRawEvents.bind(controller),
  });

  // Get aggregated metrics
  fastify.get('/aggregated', {
    schema: {
      querystring: aggregationQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    handler: controller.getAggregatedMetrics.bind(controller),
  });

  // Get event statistics
  fastify.get('/stats', {
    schema: {
      querystring: {
        type: 'object',
        required: ['startTime', 'endTime'],
        properties: {
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalEvents: { type: 'number' },
            uniqueSources: { type: 'number' },
            uniqueUsers: { type: 'number' },
            avgDuration: { type: 'number' },
            statusBreakdown: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            topEventTypes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  eventType: { type: 'string' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    handler: controller.getEventStatistics.bind(controller),
  });

  // Get advanced analytics
  fastify.get('/analytics', {
    schema: {
      querystring: advancedAnalyticsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    handler: controller.getAdvancedAnalytics.bind(controller),
  });

  // Get top patterns
  fastify.get('/patterns', {
    schema: {
      querystring: {
        type: 'object',
        required: ['startTime', 'endTime'],
        properties: {
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            patterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sequence: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  count: { type: 'number' },
                  avgDuration: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    handler: controller.getTopPatterns.bind(controller),
  });
};

export default events;
