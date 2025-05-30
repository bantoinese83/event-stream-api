import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { WebhookService } from '../services/webhook.service';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  ListWebhooksQuery,
  ListWebhookDeliveriesQuery,
} from '../schemas/webhook.schema';

export async function createWebhook(
  request: FastifyRequest<{ Body: CreateWebhookInput }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const webhook = await webhookService.createWebhook(request.body);
    return reply.status(201).send(webhook);
  } catch (error) {
    request.log.error(error, 'Failed to create webhook');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create webhook',
    });
  }
}

export async function updateWebhook(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateWebhookInput;
  }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const webhook = await webhookService.updateWebhook(request.params.id, request.body);
    return reply.send(webhook);
  } catch (error) {
    request.log.error(error, 'Failed to update webhook');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update webhook',
    });
  }
}

export async function deleteWebhook(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const token = await request.jwtVerify<{ userId: string }>();
    await webhookService.deleteWebhook(request.params.id, token.userId);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to delete webhook');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete webhook',
    });
  }
}

export async function getWebhook(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const webhook = await webhookService.getWebhook(request.params.id);
    return reply.send(webhook);
  } catch (error) {
    const err = error as Error;
    if (err.message === 'Webhook not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }
    request.log.error(error, 'Failed to get webhook');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get webhook',
    });
  }
}

export async function listWebhooks(
  request: FastifyRequest<{ Querystring: ListWebhooksQuery }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const result = await webhookService.listWebhooks(request.query);
    return reply.send(result);
  } catch (error) {
    request.log.error(error, 'Failed to list webhooks');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list webhooks',
    });
  }
}

export async function listWebhookDeliveries(
  request: FastifyRequest<{ Querystring: ListWebhookDeliveriesQuery }>,
  reply: FastifyReply
) {
  const webhookService = container.resolve(WebhookService);
  try {
    const result = await webhookService.listWebhookDeliveries(request.query);
    return reply.send(result);
  } catch (error) {
    request.log.error(error, 'Failed to list webhook deliveries');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list webhook deliveries',
    });
  }
}
