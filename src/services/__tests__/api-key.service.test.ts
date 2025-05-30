import { ApiKeyService } from '../api-key.service';
import { AppError, ErrorType, InvalidApiKeyError } from '../../utils/error.utils';
import { PrismaClient } from '@prisma/client';

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService;
  let prisma: jest.Mocked<PrismaClient>;
  let createMock: jest.Mock;
  let findUniqueMock: jest.Mock;
  let updateMock: jest.Mock;
  let findManyMock: jest.Mock;
  let deleteMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn();
    findUniqueMock = jest.fn();
    updateMock = jest.fn();
    findManyMock = jest.fn();
    deleteMock = jest.fn();
    prisma = {
      apiKey: {
        create: createMock,
        findUnique: findUniqueMock,
        update: updateMock,
        findMany: findManyMock,
        delete: deleteMock,
      },
    } as any;
    apiKeyService = new ApiKeyService(prisma);
  });

  it('should create an API key', async () => {
    createMock.mockResolvedValue({
      id: '1',
      key: 'abc',
      userId: 'u',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await apiKeyService.createApiKey('u', { name: 'test' });
    expect(result).toHaveProperty('key');
  });

  it('should handle error in createApiKey', async () => {
    createMock.mockRejectedValue(new Error('fail'));
    await expect(apiKeyService.createApiKey('u', { name: 'test' })).rejects.toThrow(AppError);
  });

  it('should validate an API key', async () => {
    const now = new Date();
    findUniqueMock.mockResolvedValue({
      id: '1',
      key: 'abc',
      userId: 'u',
      createdAt: now,
      updatedAt: now,
    });
    updateMock.mockResolvedValue({});
    const result = await apiKeyService.validateApiKey('abc');
    expect(result).toHaveProperty('key', 'abc');
  });

  it('should throw InvalidApiKeyError if not found or expired', async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(apiKeyService.validateApiKey('bad')).rejects.toThrow(InvalidApiKeyError);
    findUniqueMock.mockResolvedValue({
      id: '1',
      key: 'abc',
      userId: 'u',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(apiKeyService.validateApiKey('abc')).rejects.toThrow(InvalidApiKeyError);
  });

  it('should handle error in validateApiKey', async () => {
    findUniqueMock.mockRejectedValue(new Error('fail'));
    await expect(apiKeyService.validateApiKey('abc')).rejects.toThrow(AppError);
  });

  it('should list user API keys', async () => {
    findManyMock.mockResolvedValue([
      { id: '1', key: 'abc', userId: 'u', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const result = await apiKeyService.getUserApiKeys('u');
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('key');
  });

  it('should handle error in getUserApiKeys', async () => {
    findManyMock.mockRejectedValue(new Error('fail'));
    await expect(apiKeyService.getUserApiKeys('u')).rejects.toThrow(AppError);
  });

  it('should delete an API key', async () => {
    findUniqueMock.mockResolvedValue({ id: '1', userId: 'u' });
    deleteMock.mockResolvedValue({});
    await expect(apiKeyService.deleteApiKey('u', '1')).resolves.toBeUndefined();
  });

  it('should throw InvalidApiKeyError if delete not found or not owned', async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(apiKeyService.deleteApiKey('u', '1')).rejects.toThrow(InvalidApiKeyError);
    findUniqueMock.mockResolvedValue({ id: '1', userId: 'other' });
    await expect(apiKeyService.deleteApiKey('u', '1')).rejects.toThrow(InvalidApiKeyError);
  });

  it('should handle error in deleteApiKey', async () => {
    findUniqueMock.mockRejectedValue(new Error('fail'));
    await expect(apiKeyService.deleteApiKey('u', '1')).rejects.toThrow(AppError);
  });
});
