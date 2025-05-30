import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { RateLimitService } from '../rate-limit.service';
import { AppError, ErrorType } from '../../utils/error.utils';
import { logger } from '../../utils/logger';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  },
}));

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    rateLimitService = new RateLimitService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    const key = 'user123';
    const endpoint = 'api:events';
    const now = new Date();
    const resetAt = new Date(now.getTime() + 60000); // 1 minute from now

    it('should allow request when under limit', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 50,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      mockPrisma.rateLimit.update.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 51,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      const result = await rateLimitService.checkRateLimit(key, endpoint);
      expect(result.isLimited).toBe(false);
      expect(result.limitInfo.remaining).toBe(49);
      expect(mockPrisma.rateLimit.findUnique).toHaveBeenCalledWith({
        where: {
          key_endpoint: { key, endpoint },
        },
      });
    });

    it('should block request when over limit', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 100,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      mockPrisma.rateLimit.update.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 101,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      const result = await rateLimitService.checkRateLimit(key, endpoint);
      expect(result.isLimited).toBe(true);
      expect(result.limitInfo.remaining).toBe(0);
      expect(mockPrisma.rateLimit.findUnique).toHaveBeenCalledWith({
        where: {
          key_endpoint: { key, endpoint },
        },
      });
    });

    it('should create new rate limit when none exists', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue(null);
      mockPrisma.rateLimit.upsert.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 1,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      const result = await rateLimitService.checkRateLimit(key, endpoint);
      expect(result.isLimited).toBe(false);
      expect(result.limitInfo.remaining).toBe(99);
      expect(mockPrisma.rateLimit.upsert).toHaveBeenCalledWith({
        where: {
          key_endpoint: { key, endpoint },
        },
        update: {
          count: 1,
          resetAt: expect.any(Date),
        },
        create: {
          key,
          endpoint,
          count: 1,
          resetAt: expect.any(Date),
        },
      });
    });

    it('should reset count when window has expired', async () => {
      const lastReset = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 100,
        resetAt: lastReset,
        createdAt: now,
        updatedAt: now,
      });

      mockPrisma.rateLimit.upsert.mockResolvedValue({
        id: '1',
        key,
        endpoint,
        count: 1,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      const result = await rateLimitService.checkRateLimit(key, endpoint);
      expect(result.isLimited).toBe(false);
      expect(result.limitInfo.remaining).toBe(99);
      expect(mockPrisma.rateLimit.upsert).toHaveBeenCalledWith({
        where: {
          key_endpoint: { key, endpoint },
        },
        update: {
          count: 1,
          resetAt: expect.any(Date),
        },
        create: {
          key,
          endpoint,
          count: 1,
          resetAt: expect.any(Date),
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.rateLimit.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(rateLimitService.checkRateLimit(key, endpoint)).rejects.toThrow(
        new AppError(ErrorType.INTERNAL, 'Failed to check rate limit', 500)
      );
      expect(mockPrisma.rateLimit.findUnique).toHaveBeenCalledWith({
        where: {
          key_endpoint: { key, endpoint },
        },
      });
      expect(logger.error).toHaveBeenCalledWith('Rate limit check failed', {
        error: expect.any(Error),
        key,
        endpoint,
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up expired rate limits', async () => {
      mockPrisma.rateLimit.deleteMany.mockResolvedValue({ count: 1 });

      await rateLimitService.cleanup();
      expect(mockPrisma.rateLimit.deleteMany).toHaveBeenCalledWith({
        where: {
          resetAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should handle errors when cleaning up', async () => {
      mockPrisma.rateLimit.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(rateLimitService.cleanup()).rejects.toThrow(
        new AppError(ErrorType.DATABASE, 'Failed to clean up rate limits', 500)
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error cleaning up rate limits:',
        expect.any(Error)
      );
    });
  });

  describe('getHeaders', () => {
    it('should return rate limit headers when enabled', () => {
      const info = {
        limit: 100,
        remaining: 50,
        reset: 1704067200, // 2024-01-01T00:00:00Z
      };

      const headers = rateLimitService.getHeaders(info);

      expect(headers).toEqual({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': '1704067200',
      });
    });

    it('should return empty headers when disabled', () => {
      const service = new RateLimitService(mockPrisma, { headers: false });
      const info = {
        limit: 100,
        remaining: 50,
        reset: 1704067200,
      };

      const headers = service.getHeaders(info);

      expect(headers).toEqual({});
    });
  });
});
