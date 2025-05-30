import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  ListWebhooksQuery,
  ListWebhookDeliveriesQuery,
  WebhookResponse,
  WebhookDeliveryResponse,
} from '../schemas/webhook.schema';

export interface WebhookDeliveryConfig {
  maxRetries: number;
  retryDelays: number[];
  timeout: number;
  signatureHeader: string;
  idHeader: string;
  deliveryIdHeader: string;
  eventTypeHeader: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode: number;
  response?: unknown;
  error?: string;
  deliveryId: string;
  attempt: number;
}

export interface IWebhookService {
  createWebhook(input: CreateWebhookInput): Promise<WebhookResponse>;
  updateWebhook(id: string, input: UpdateWebhookInput): Promise<WebhookResponse>;
  deleteWebhook(id: string, userId: string): Promise<void>;
  getWebhook(id: string): Promise<WebhookResponse>;
  listWebhooks(query: ListWebhooksQuery): Promise<{
    data: WebhookResponse[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  listWebhookDeliveries(query: ListWebhookDeliveriesQuery): Promise<{
    data: WebhookDeliveryResponse[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  triggerWebhooks(eventType: string, payload: unknown): Promise<WebhookDeliveryResult[]>;
}

export interface IWebhookRepository {
  create(data: CreateWebhookInput): Promise<WebhookResponse>;
  update(id: string, data: UpdateWebhookInput): Promise<WebhookResponse>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<WebhookResponse | null>;
  findByEventType(eventType: string, activeOnly?: boolean): Promise<WebhookResponse[]>;
  findMany(query: ListWebhooksQuery): Promise<{
    data: WebhookResponse[];
    total: number;
  }>;
  findDeliveries(query: ListWebhookDeliveriesQuery): Promise<{
    data: WebhookDeliveryResponse[];
    total: number;
  }>;
  updateDeliveryStatus(webhookId: string, result: WebhookDeliveryResult): Promise<void>;
}
