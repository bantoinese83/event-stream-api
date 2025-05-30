import 'reflect-metadata';
import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { mock } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { WebhookService } from '../../services/webhook.service';
import { WebhookRepository } from '../../repositories/webhook.repository';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  listWebhookDeliveries,
} from '../../controllers/webhook.controller';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookResponse,
  ListWebhooksQuery,
  ListWebhookDeliveriesQuery,
} from '../../schemas/webhook.schema';
import { AppError, ErrorType } from '../../utils/error.utils';

describe('WebhookController', () => {
  let mockWebhookService: jest.Mocked<WebhookService>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLogger: FastifyBaseLogger;

  beforeEach(() => {
    // Create mock instances
    mockWebhookService = mock<WebhookService>();
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnThis(),
      level: 'info',
    } as unknown as FastifyBaseLogger;
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Reset container and register mocks
    container.clearInstances();
    container.registerInstance(WebhookService, mockWebhookService);
    container.registerInstance(WebhookRepository, mock<WebhookRepository>());
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

      mockWebhookService.createWebhook.mockResolvedValue(expectedResponse);
      mockRequest = {
        body: createWebhookInput,
      };

      await createWebhook(
        mockRequest as FastifyRequest<{ Body: CreateWebhookInput }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.createWebhook).toHaveBeenCalledWith(createWebhookInput);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle errors when creating a webhook', async () => {
      const error = new AppError(ErrorType.VALIDATION, 'Invalid webhook data', 400);
      mockWebhookService.createWebhook.mockRejectedValue(error);
      mockRequest = {
        body: createWebhookInput,
        log: mockLogger,
      };

      await createWebhook(
        mockRequest as FastifyRequest<{ Body: CreateWebhookInput }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to create webhook',
      });
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

      mockWebhookService.updateWebhook.mockResolvedValue(expectedResponse);
      mockRequest = {
        params: { id: '123' },
        body: updateWebhookInput,
      };

      await updateWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: UpdateWebhookInput }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.updateWebhook).toHaveBeenCalledWith('123', updateWebhookInput);
      expect(mockReply.send).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle errors when updating a webhook', async () => {
      const error = new AppError(ErrorType.VALIDATION, 'Invalid webhook data', 400);
      mockWebhookService.updateWebhook.mockRejectedValue(error);
      mockRequest = {
        params: { id: '123' },
        body: updateWebhookInput,
        log: mockLogger,
      };

      await updateWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: UpdateWebhookInput }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to update webhook',
      });
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook successfully', async () => {
      mockRequest = {
        params: { id: '123' },
        jwtVerify: jest.fn().mockResolvedValue({ userId: 'user123' }),
      };

      await deleteWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.deleteWebhook).toHaveBeenCalledWith('123', 'user123');
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should handle errors when deleting a webhook', async () => {
      const error = new AppError(ErrorType.NOT_FOUND, 'Webhook not found', 404);
      mockWebhookService.deleteWebhook.mockRejectedValue(error);
      mockRequest = {
        params: { id: '123' },
        jwtVerify: jest.fn().mockResolvedValue({ userId: 'user123' }),
        log: mockLogger,
      };

      await deleteWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to delete webhook',
      });
    });

    it('should handle JWT verification errors', async () => {
      mockRequest = {
        params: { id: '123' },
        jwtVerify: jest.fn().mockRejectedValue(new Error('Invalid token')),
        log: mockLogger,
      };

      await deleteWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to delete webhook',
      });
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

      mockWebhookService.getWebhook.mockResolvedValue(expectedResponse);
      mockRequest = {
        params: { id: '123' },
      };

      await getWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.getWebhook).toHaveBeenCalledWith('123');
      expect(mockReply.send).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle not found error', async () => {
      mockWebhookService.getWebhook.mockRejectedValue(new Error('Webhook not found'));
      mockRequest = {
        params: { id: '123' },
        log: mockLogger,
      };

      await getWebhook(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Webhook not found',
      });
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
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      };

      mockWebhookService.listWebhooks.mockResolvedValue(expectedResponse);
      mockRequest = {
        query: { page: 1, pageSize: 20 },
      };

      await listWebhooks(
        mockRequest as FastifyRequest<{ Querystring: ListWebhooksQuery }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.listWebhooks).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(mockReply.send).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle errors when listing webhooks', async () => {
      mockWebhookService.listWebhooks.mockRejectedValue(new Error('Database error'));
      mockRequest = {
        query: { page: 1, pageSize: 20 },
        log: mockLogger,
      };

      await listWebhooks(
        mockRequest as FastifyRequest<{ Querystring: ListWebhooksQuery }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to list webhooks',
      });
    });
  });

  describe('listWebhookDeliveries', () => {
    it('should list webhook deliveries successfully', async () => {
      const expectedResponse = {
        data: [
          {
            id: '789',
            webhookId: '123',
            eventId: '456',
            status: 'success' as const,
            response: { status: 200 },
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      };

      mockWebhookService.listWebhookDeliveries.mockResolvedValue(expectedResponse);
      mockRequest = {
        query: { page: 1, pageSize: 20 },
      };

      await listWebhookDeliveries(
        mockRequest as FastifyRequest<{ Querystring: ListWebhookDeliveriesQuery }>,
        mockReply as FastifyReply
      );

      expect(mockWebhookService.listWebhookDeliveries).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
      expect(mockReply.send).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle errors when listing webhook deliveries', async () => {
      mockWebhookService.listWebhookDeliveries.mockRejectedValue(new Error('Database error'));
      mockRequest = {
        query: { page: 1, pageSize: 20 },
        log: mockLogger,
      };

      await listWebhookDeliveries(
        mockRequest as FastifyRequest<{ Querystring: ListWebhookDeliveriesQuery }>,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to list webhook deliveries',
      });
    });
  });
});
