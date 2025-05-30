import 'reflect-metadata';
import { mock } from 'jest-mock-extended';
import { WebhookService } from '../webhook.service';
import { WebhookRepository } from '../../repositories/webhook.repository';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookResponse,
} from '../../schemas/webhook.schema';
import { WebhookNotFoundError } from '../../utils/error.utils';
import axios from 'axios';
import crypto from 'crypto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockWebhookRepository: jest.Mocked<WebhookRepository>;

  beforeEach(() => {
    mockWebhookRepository = mock<WebhookRepository>();
    webhookService = new WebhookService(mockWebhookRepository);
  });

  describe('createWebhook', () => {
    const createWebhookInput: CreateWebhookInput = {
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'webhook-secret-123456',
      events: ['event.created'],
      headers: { 'X-Custom-Header': 'value' },
      enabled: true,
      retryCount: 3,
    };

    it('should create a webhook successfully', async () => {
      const expectedResponse: WebhookResponse = {
        id: '123',
        ...createWebhookInput,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWebhookRepository.create.mockResolvedValue(expectedResponse);

      const result = await webhookService.createWebhook(createWebhookInput);

      expect(mockWebhookRepository.create).toHaveBeenCalledWith(createWebhookInput);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('updateWebhook', () => {
    const updateWebhookInput: UpdateWebhookInput = {
      name: 'Updated Webhook',
      enabled: false,
    };

    it('should update a webhook successfully', async () => {
      const expectedResponse: WebhookResponse = {
        id: '123',
        name: 'Updated Webhook',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-123456',
        events: ['event.created'],
        enabled: false,
        retryCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWebhookRepository.findById.mockResolvedValue(expectedResponse);
      mockWebhookRepository.update.mockResolvedValue(expectedResponse);

      const result = await webhookService.updateWebhook('123', updateWebhookInput);

      expect(mockWebhookRepository.update).toHaveBeenCalledWith('123', updateWebhookInput);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook successfully', async () => {
      const webhook: WebhookResponse = {
        id: '123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-123456',
        events: ['event.created'],
        enabled: true,
        retryCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWebhookRepository.findById.mockResolvedValue(webhook);
      mockWebhookRepository.delete.mockResolvedValue();

      await webhookService.deleteWebhook('123', 'user123');

      expect(mockWebhookRepository.delete).toHaveBeenCalledWith('123');
    });
  });

  describe('getWebhook', () => {
    it('should get a webhook successfully', async () => {
      const expectedResponse: WebhookResponse = {
        id: '123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-123456',
        events: ['event.created'],
        enabled: true,
        retryCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWebhookRepository.findById.mockResolvedValue(expectedResponse);

      const result = await webhookService.getWebhook('123');

      expect(mockWebhookRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(expectedResponse);
    });

    it('should throw WebhookNotFoundError when webhook does not exist', async () => {
      mockWebhookRepository.findById.mockResolvedValue(null);

      await expect(webhookService.getWebhook('123')).rejects.toThrow(WebhookNotFoundError);
    });
  });

  describe('triggerWebhooks', () => {
    const mockWebhook: WebhookResponse = {
      id: '123',
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'webhook-secret-123456',
      events: ['event.created'],
      enabled: true,
      retryCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const payload = { test: 'data' };

    beforeEach(() => {
      mockWebhookRepository.findByEventType.mockResolvedValue([mockWebhook]);
      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });
      mockWebhookRepository.updateDeliveryStatus.mockResolvedValue(
        {} as unknown as ReturnType<typeof mockWebhookRepository.updateDeliveryStatus>
      );
    });

    it('should trigger webhooks successfully', async () => {
      const results = await webhookService.triggerWebhooks('event.created', payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);
      expect(mockWebhookRepository.updateDeliveryStatus).toHaveBeenCalled();
    });

    it('should handle webhook delivery failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Failed to deliver'));

      const results = await webhookService.triggerWebhooks('event.created', payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(mockWebhookRepository.updateDeliveryStatus).toHaveBeenCalled();
    });

    it('should retry failed webhooks', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Failed to deliver'))
        .mockResolvedValueOnce({ status: 200, data: { success: true } });

      const results = await webhookService.triggerWebhooks('event.created', payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should generate correct signature', async () => {
      await webhookService.triggerWebhooks('event.created', payload);

      const expectedSignature = crypto
        .createHmac('sha256', mockWebhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockWebhook.url,
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-webhook-signature': expectedSignature,
          }),
        })
      );
    });
  });

  describe('listWebhooks', () => {
    it('should list webhooks successfully', async () => {
      const expectedResponse = {
        data: [
          {
            id: '123',
            name: 'Test Webhook',
            url: 'https://example.com/webhook',
            secret: 'webhook-secret-123456',
            events: ['event.created'],
            enabled: true,
            retryCount: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };

      mockWebhookRepository.findMany.mockResolvedValue(
        expectedResponse as unknown as ReturnType<typeof mockWebhookRepository.findMany>
      );

      const result = await webhookService.listWebhooks({ page: 1, pageSize: 20 });

      expect(mockWebhookRepository.findMany).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(result.data).toEqual(expectedResponse.data);
      expect(result.pagination.total).toBe(expectedResponse.total);
    });
  });

  describe('listWebhookDeliveries', () => {
    it('should list webhook deliveries successfully', async () => {
      const expectedResponse = {
        data: [
          {
            id: '123',
            webhookId: '456',
            eventId: '789',
            status: 'success' as const,
            response: { status: 200 },
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };

      mockWebhookRepository.findDeliveries.mockResolvedValue(expectedResponse);

      const result = await webhookService.listWebhookDeliveries({ page: 1, pageSize: 20 });

      expect(mockWebhookRepository.findDeliveries).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(result.data).toEqual(expectedResponse.data);
      expect(result.pagination.total).toBe(expectedResponse.total);
    });
  });
});
