import { inject, injectable } from 'tsyringe';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { CreateApiKeyInput, ApiKeyResponse } from '../interfaces/auth.interface';
import { InvalidApiKeyError, AppError, ErrorType, handlePrismaError } from '../utils/error.utils';
import { formatApiKeyResponse } from './auth.utils';

@injectable()
export class ApiKeyService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  /**
   * Creates a new API key for a user.
   * @param userId - The user ID
   * @param data - The API key creation input
   * @param apiKeyLength - The length of the generated API key (default: 32)
   * @returns The created API key response
   */
  async createApiKey(
    userId: string,
    data: CreateApiKeyInput,
    apiKeyLength = 32
  ): Promise<ApiKeyResponse> {
    try {
      const apiKey = await this.prisma.apiKey.create({
        data: {
          ...data,
          key: crypto.randomBytes(apiKeyLength).toString('hex'),
          userId,
        },
      });
      return formatApiKeyResponse(apiKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to create API key', 500);
    }
  }

  /**
   * Validates an API key and returns its details if valid.
   * @param key - The API key string
   * @returns The API key response if valid, or null
   */
  async validateApiKey(key: string): Promise<ApiKeyResponse | null> {
    try {
      const apiKey = await this.prisma.apiKey.findUnique({
        where: { key },
        include: {
          user: {
            include: {
              roles: { include: { permissions: true } },
            },
          },
        },
      });
      if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
        throw new InvalidApiKeyError();
      }
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });
      return formatApiKeyResponse(apiKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to validate API key', 500);
    }
  }

  /**
   * Lists all API keys for a user.
   * @param userId - The user ID
   * @returns An array of API key responses
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    try {
      const apiKeys = await this.prisma.apiKey.findMany({ where: { userId } });
      return apiKeys.map(apiKey => formatApiKeyResponse(apiKey));
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to get user API keys', 500);
    }
  }

  /**
   * Deletes an API key for a user.
   * @param userId - The user ID
   * @param keyId - The API key ID
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    try {
      const apiKey = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
      if (!apiKey || apiKey.userId !== userId) {
        throw new InvalidApiKeyError();
      }
      await this.prisma.apiKey.delete({ where: { id: keyId } });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to delete API key', 500);
    }
  }
}
