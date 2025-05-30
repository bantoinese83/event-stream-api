import { inject, injectable } from 'tsyringe';
import { randomUUID } from 'crypto';
import axios, { AxiosError } from 'axios';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  ListWebhooksQuery,
  ListWebhookDeliveriesQuery,
  WebhookResponse,
  WebhookDeliveryResponse,
} from '../schemas/webhook.schema';
import type {
  IWebhookService,
  IWebhookRepository,
  WebhookDeliveryConfig,
  WebhookDeliveryResult,
} from '../interfaces/webhook.interface';
import { WebhookRepository } from '../repositories/webhook.repository';
import { createHmac } from 'crypto';
import { logger } from '../utils/logger';
import { WebhookNotFoundError, handlePrismaError } from '../utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MonitorPerformance } from '../utils/performance.utils';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Service for managing webhooks and their delivery
 */
@injectable()
export class WebhookService implements IWebhookService {
  private readonly deliveryConfig: WebhookDeliveryConfig = {
    maxRetries: 3,
    retryDelays: [1000, 5000, 15000], // Exponential backoff
    timeout: 10000,
    signatureHeader: 'x-webhook-signature',
    idHeader: 'x-webhook-id',
    deliveryIdHeader: 'x-delivery-id',
    eventTypeHeader: 'x-event-type',
  };

  constructor(@inject(WebhookRepository) private readonly webhookRepository: IWebhookRepository) {}

  @MonitorPerformance()
  async createWebhook(input: CreateWebhookInput): Promise<WebhookResponse> {
    try {
      return await this.webhookRepository.create(input);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  @MonitorPerformance()
  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<WebhookResponse> {
    try {
      return await this.webhookRepository.update(id, input);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Deletes a webhook subscription
   */
  @MonitorPerformance()
  async deleteWebhook(id: string, _userId: string): Promise<void> {
    // First verify the webhook exists
    await this.getWebhook(id);

    try {
      // Delete the webhook - the repository layer should handle ownership verification
      await this.webhookRepository.delete(id);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Retrieves a webhook subscription
   */
  @MonitorPerformance()
  async getWebhook(id: string): Promise<WebhookResponse> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new WebhookNotFoundError(id);
    }
    return webhook;
  }

  /**
   * Retrieves all webhooks with optional filtering
   */
  async listWebhooks(query: ListWebhooksQuery): Promise<{
    data: WebhookResponse[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const { data, total } = await this.webhookRepository.findMany(query);
    return {
      data,
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Retrieves all webhook deliveries with optional filtering
   */
  async listWebhookDeliveries(query: ListWebhookDeliveriesQuery): Promise<{
    data: WebhookDeliveryResponse[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const { data, total } = await this.webhookRepository.findDeliveries(query);
    return {
      data,
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Triggers webhook deliveries for an event
   */
  async triggerWebhooks(eventType: string, payload: unknown): Promise<WebhookDeliveryResult[]> {
    const webhooks = await this.webhookRepository.findByEventType(eventType, true);

    const deliveryPromises = webhooks.map(webhook =>
      this.deliverWebhook(webhook, eventType, payload)
    );

    return Promise.all(deliveryPromises);
  }

  /**
   * Delivers a webhook with retry logic
   */
  private async deliverWebhook(
    webhook: WebhookResponse,
    eventType: string,
    payload: unknown
  ): Promise<WebhookDeliveryResult> {
    const deliveryId = randomUUID();
    let attempt = 0;
    let lastError: Error | null = null;

    // Try delivery with retries
    while (attempt < this.deliveryConfig.maxRetries) {
      attempt++;

      try {
        const signature = this.generateSignature(webhook.secret, JSON.stringify(payload));
        const response = await axios.post(webhook.url, payload, {
          timeout: this.deliveryConfig.timeout,
          headers: {
            'Content-Type': 'application/json',
            [this.deliveryConfig.signatureHeader]: signature,
            [this.deliveryConfig.idHeader]: webhook.id,
            [this.deliveryConfig.deliveryIdHeader]: deliveryId,
            [this.deliveryConfig.eventTypeHeader]: eventType,
          },
        });

        const result: WebhookDeliveryResult = {
          success: true,
          statusCode: response.status,
          response: response.data,
          deliveryId,
          attempt,
        };

        await this.webhookRepository.updateDeliveryStatus(webhook.id, result);
        return result;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        logger.error('Webhook delivery failed', {
          webhookId: webhook.id,
          deliveryId,
          attempt,
          error: axiosError.message,
          status: axiosError.response?.status,
          url: webhook.url,
        });

        // Wait before retry using exponential backoff
        if (attempt < this.deliveryConfig.maxRetries) {
          await sleep(this.deliveryConfig.retryDelays[attempt - 1]);
        }
      }
    }

    // All retries failed
    const result: WebhookDeliveryResult = {
      success: false,
      statusCode: (lastError as AxiosError)?.response?.status || 0,
      error: lastError?.message,
      deliveryId,
      attempt,
    };

    await this.webhookRepository.updateDeliveryStatus(webhook.id, result);
    return result;
  }

  /**
   * Generates an HMAC signature for webhook payload
   */
  private generateSignature(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
