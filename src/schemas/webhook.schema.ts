import { z } from 'zod';

// Common validation constants
const MAX_STRING_LENGTH = 255;
const MAX_RETRY_COUNT = 10;

// Base webhook fields schema
const webhookBaseFields = {
  name: z.string().max(MAX_STRING_LENGTH),
  url: z.string().url(),
  secret: z.string().min(16).max(64),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  retryCount: z.number().int().min(0).max(MAX_RETRY_COUNT).default(3),
};

// Schema for creating webhooks
export const createWebhookSchema = z.object(webhookBaseFields);

// Schema for updating webhooks
export const updateWebhookSchema = z
  .object({
    ...webhookBaseFields,
  })
  .partial();

// Schema for webhook responses
export const webhookResponseSchema = z.object({
  id: z.string().uuid(),
  ...webhookBaseFields,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Schema for webhook delivery responses
export const webhookDeliveryResponseSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(['success', 'failed', 'pending']),
  response: z.record(z.any()).optional(),
  error: z.string().optional(),
  retryCount: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Schema for webhook delivery results
export const webhookDeliveryResultSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  deliveryId: z.string().uuid(),
  attempt: z.number().int().min(0),
  error: z.string().optional(),
  response: z.record(z.any()).optional(),
});

// Schema for listing webhooks
export const listWebhooksSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  enabled: z.boolean().optional(),
});

// Schema for listing webhook deliveries
export const listWebhookDeliveriesSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  webhookId: z.string().uuid().optional(),
  status: z.enum(['success', 'failed', 'pending']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

// Export types
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type WebhookResponse = z.infer<typeof webhookResponseSchema>;
export type WebhookDeliveryResponse = z.infer<typeof webhookDeliveryResponseSchema>;
export type WebhookDeliveryResult = z.infer<typeof webhookDeliveryResultSchema>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksSchema>;
export type ListWebhookDeliveriesQuery = z.infer<typeof listWebhookDeliveriesSchema>;
