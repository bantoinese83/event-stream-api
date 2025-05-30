import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { WebhookRepository } from '../webhook.repository';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDeliveryResult,
} from '../../schemas/webhook.schema';

describe('WebhookRepository', () => {
  let webhookRepository: WebhookRepository;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      webhook: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      webhookDelivery: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;
    webhookRepository = new WebhookRepository(mockPrisma);
  });

  describe('create', () => {
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
      const expectedResponse = {
        id: '123',
        ...createWebhookInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.webhook.create as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await webhookRepository.create(createWebhookInput);

      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: createWebhookInput,
      });
      expect(result).toEqual({
        ...expectedResponse,
        createdAt: expectedResponse.createdAt.toISOString(),
        updatedAt: expectedResponse.updatedAt.toISOString(),
      });
    });
  });

  describe('update', () => {
    const updateWebhookInput: UpdateWebhookInput = {
      name: 'Updated Webhook',
      enabled: false,
    };

    it('should update a webhook successfully', async () => {
      const expectedResponse = {
        id: '123',
        name: 'Updated Webhook',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-123456',
        events: ['event.created'],
        enabled: false,
        retryCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.webhook.update as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await webhookRepository.update('123', updateWebhookInput);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: updateWebhookInput,
      });
      expect(result).toEqual({
        ...expectedResponse,
        createdAt: expectedResponse.createdAt.toISOString(),
        updatedAt: expectedResponse.updatedAt.toISOString(),
      });
    });
  });

  describe('delete', () => {
    it('should delete a webhook successfully', async () => {
      await webhookRepository.delete('123');

      expect(mockPrisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });
  });

  describe('findById', () => {
    it('should find a webhook by id successfully', async () => {
      const expectedResponse = {
        id: '123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-123456',
        events: ['event.created'],
        enabled: true,
        retryCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.webhook.findUnique as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await webhookRepository.findById('123');

      expect(mockPrisma.webhook.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toEqual({
        ...expectedResponse,
        createdAt: expectedResponse.createdAt.toISOString(),
        updatedAt: expectedResponse.updatedAt.toISOString(),
      });
    });

    it('should return null when webhook is not found', async () => {
      (mockPrisma.webhook.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await webhookRepository.findById('123');

      expect(result).toBeNull();
    });
  });

  describe('findByEventType', () => {
    it('should find webhooks by event type successfully', async () => {
      const expectedResponse = [
        {
          id: '123',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          secret: 'webhook-secret-123456',
          events: ['event.created'],
          enabled: true,
          retryCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.webhook.findMany as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await webhookRepository.findByEventType('event.created');

      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
          events: { has: 'event.created' },
        },
      });
      expect(result).toEqual(
        expectedResponse.map(webhook => ({
          ...webhook,
          createdAt: webhook.createdAt.toISOString(),
          updatedAt: webhook.updatedAt.toISOString(),
        }))
      );
    });
  });

  describe('findMany', () => {
    it('should find many webhooks successfully', async () => {
      const expectedResponse = {
        webhooks: [
          {
            id: '123',
            name: 'Test Webhook',
            url: 'https://example.com/webhook',
            secret: 'webhook-secret-123456',
            events: ['event.created'],
            enabled: true,
            retryCount: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      };

      (mockPrisma.webhook.findMany as jest.Mock).mockResolvedValue(expectedResponse.webhooks);
      (mockPrisma.webhook.count as jest.Mock).mockResolvedValue(expectedResponse.total);

      const result = await webhookRepository.findMany({ page: 1, pageSize: 20 });

      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        data: expectedResponse.webhooks.map(webhook => ({
          ...webhook,
          createdAt: webhook.createdAt.toISOString(),
          updatedAt: webhook.updatedAt.toISOString(),
        })),
        total: expectedResponse.total,
      });
    });
  });

  describe('findDeliveries', () => {
    it('should find webhook deliveries successfully', async () => {
      const expectedResponse = {
        deliveries: [
          {
            id: '789',
            webhookId: '123',
            eventId: '456',
            status: 'success' as const,
            response: { status: 200 },
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      };

      (mockPrisma.webhookDelivery.findMany as jest.Mock).mockResolvedValue(
        expectedResponse.deliveries
      );
      (mockPrisma.webhookDelivery.count as jest.Mock).mockResolvedValue(expectedResponse.total);

      const result = await webhookRepository.findDeliveries({ page: 1, pageSize: 20 });

      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        data: expectedResponse.deliveries.map(delivery => ({
          ...delivery,
          createdAt: delivery.createdAt.toISOString(),
          updatedAt: delivery.updatedAt.toISOString(),
        })),
        total: expectedResponse.total,
      });
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update webhook delivery status successfully', async () => {
      const updateData: WebhookDeliveryResult = {
        success: true,
        statusCode: 200,
        deliveryId: '789',
        attempt: 1,
      };

      const expectedResponse = {
        id: '789',
        webhookId: '123',
        eventId: '456',
        status: 'success' as const,
        response: { status: 200 },
        retryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.webhook.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.webhookDelivery.create as jest.Mock).mockResolvedValue(expectedResponse);

      await webhookRepository.updateDeliveryStatus('789', updateData);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: '789' },
        data: {
          enabled: true,
        },
      });

      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: {
          webhookId: '789',
          eventId: updateData.deliveryId,
          status: 'success',
          response: JSON.stringify(updateData.response),
          error: null,
          retryCount: updateData.attempt,
        },
      });
    });
  });
});
