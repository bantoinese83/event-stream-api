import { FastifyPluginAsync } from 'fastify';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  listWebhookDeliveries,
} from '../../../controllers/webhook.controller';
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookResponseSchema,
  webhookDeliveryResponseSchema,
  listWebhooksSchema,
  listWebhookDeliveriesSchema,
} from '../../../schemas/webhook.schema';

const webhooks: FastifyPluginAsync = async fastify => {
  // Create webhook
  fastify.post('/', {
    schema: {
      body: createWebhookSchema,
      response: {
        201: webhookResponseSchema,
      },
    },
    handler: createWebhook,
  });

  // Update webhook
  fastify.patch('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: updateWebhookSchema,
      response: {
        200: webhookResponseSchema,
      },
    },
    handler: updateWebhook,
  });

  // Delete webhook
  fastify.delete('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
        },
      },
    },
    handler: deleteWebhook,
  });

  // Get webhook
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: webhookResponseSchema,
      },
    },
    handler: getWebhook,
  });

  // List webhooks
  fastify.get('/', {
    schema: {
      querystring: listWebhooksSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: webhookResponseSchema,
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
    handler: listWebhooks,
  });

  // List webhook deliveries
  fastify.get('/deliveries', {
    schema: {
      querystring: listWebhookDeliveriesSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: webhookDeliveryResponseSchema,
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
    handler: listWebhookDeliveries,
  });
};

export default webhooks;
