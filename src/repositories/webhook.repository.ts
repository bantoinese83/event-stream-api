import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  ListWebhooksQuery,
  ListWebhookDeliveriesQuery,
  WebhookResponse,
  WebhookDeliveryResponse,
} from '../schemas/webhook.schema';
import type { IWebhookRepository, WebhookDeliveryResult } from '../interfaces/webhook.interface';

@injectable()
export class WebhookRepository implements IWebhookRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateWebhookInput): Promise<WebhookResponse> {
    const webhook = await this.prisma.webhook.create({
      data: {
        name: data.name,
        url: data.url,
        secret: data.secret,
        events: data.events,
        headers: data.headers as Record<string, string>,
        enabled: data.enabled,
        retryCount: data.retryCount,
      },
    });

    return this.mapWebhookToResponse(webhook);
  }

  async update(id: string, data: UpdateWebhookInput): Promise<WebhookResponse> {
    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        secret: data.secret,
        events: data.events,
        headers: data.headers as Record<string, string>,
        enabled: data.enabled,
        retryCount: data.retryCount,
      },
    });

    return this.mapWebhookToResponse(webhook);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<WebhookResponse | null> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    return webhook ? this.mapWebhookToResponse(webhook) : null;
  }

  async findByEventType(eventType: string, activeOnly = true): Promise<WebhookResponse[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        ...(activeOnly && { enabled: true }),
        events: {
          has: eventType,
        },
      },
    });

    return webhooks.map(this.mapWebhookToResponse);
  }

  async findMany(query: ListWebhooksQuery): Promise<{
    data: WebhookResponse[];
    total: number;
  }> {
    const where = {
      ...(query.enabled !== undefined && { enabled: query.enabled }),
    };

    const [webhooks, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.webhook.count({ where }),
    ]);

    return {
      data: webhooks.map(this.mapWebhookToResponse),
      total,
    };
  }

  async findDeliveries(query: ListWebhookDeliveriesQuery): Promise<{
    data: WebhookDeliveryResponse[];
    total: number;
  }> {
    const where = {
      ...(query.webhookId && { webhookId: query.webhookId }),
      ...(query.status && { status: query.status }),
      ...(query.startTime && { createdAt: { gte: new Date(query.startTime) } }),
      ...(query.endTime && { createdAt: { lte: new Date(query.endTime) } }),
    };

    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return {
      data: deliveries.map(this.mapDeliveryToResponse),
      total,
    };
  }

  async updateDeliveryStatus(webhookId: string, result: WebhookDeliveryResult): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        enabled: result.success,
      },
    });

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventId: result.deliveryId,
        status: result.success ? 'success' : 'failed',
        response: JSON.stringify(result.response),
        error: result.error || null,
        retryCount: result.attempt,
      },
    });
  }

  private mapWebhookToResponse(
    webhook: NonNullable<Awaited<ReturnType<typeof this.prisma.webhook.findUnique>>>
  ): WebhookResponse {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      headers: webhook.headers as Record<string, string> | undefined,
      enabled: webhook.enabled,
      retryCount: webhook.retryCount,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };
  }

  private mapDeliveryToResponse(
    delivery: NonNullable<Awaited<ReturnType<typeof this.prisma.webhookDelivery.findUnique>>>
  ): WebhookDeliveryResponse {
    return {
      id: delivery.id,
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
      status: delivery.status as 'success' | 'failed' | 'pending',
      response: delivery.response as Record<string, unknown> | undefined,
      error: delivery.error || undefined,
      retryCount: delivery.retryCount,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    };
  }
}
