import { PrismaClient } from '@prisma/client';
import type { RateLimitConfig, RateLimitInfo } from '../schemas/rate-limit.schema';
import { AppError, ErrorType } from '../utils/error.utils';
import { logger } from '../utils/logger';

export class RateLimitService {
  private readonly config: Required<RateLimitConfig>;
  private readonly prisma: PrismaClient;
  private static readonly DEFAULT_CONFIG: Required<RateLimitConfig> = {
    windowMs: 60000, // 1 minute
    max: 100,
    message: 'Too many requests, please try again later.',
    statusCode: 429,
    headers: true,
  };

  constructor(prisma: PrismaClient, config: Partial<RateLimitConfig> = {}) {
    this.prisma = prisma;
    this.config = this.validateAndMergeConfig(config);
  }

  /**
   * Checks if a request should be rate limited
   */
  async checkRateLimit(
    key: string,
    endpoint: string
  ): Promise<{
    isLimited: boolean;
    limitInfo: RateLimitInfo;
  }> {
    try {
      const now = new Date();
      const resetAt = new Date(now.getTime() + this.config.windowMs);
      const rateLimit = await this.getOrCreateRateLimit(key, endpoint, now, resetAt);

      return this.calculateLimitInfo(rateLimit, rateLimit.resetAt);
    } catch (error) {
      logger.error('Rate limit check failed', { error, key, endpoint });
      throw new AppError(ErrorType.INTERNAL, 'Failed to check rate limit', 500, {
        originalError: error,
      });
    }
  }

  /**
   * Gets the rate limit error message
   */
  getRateLimitMessage(): string {
    return this.config.message;
  }

  /**
   * Gets the rate limit status code
   */
  getRateLimitStatusCode(): number {
    return this.config.statusCode;
  }

  private validateAndMergeConfig(config: Partial<RateLimitConfig>): Required<RateLimitConfig> {
    if (config.windowMs !== undefined && config.windowMs <= 0) {
      throw new AppError(ErrorType.VALIDATION, 'Window size must be greater than 0', 400);
    }

    if (config.max !== undefined && config.max <= 0) {
      throw new AppError(ErrorType.VALIDATION, 'Maximum requests must be greater than 0', 400);
    }

    return {
      ...RateLimitService.DEFAULT_CONFIG,
      ...config,
    };
  }

  private async getOrCreateRateLimit(key: string, endpoint: string, now: Date, resetAt: Date) {
    const rateLimit = await this.prisma.rateLimit.findUnique({
      where: {
        key_endpoint: { key, endpoint },
      },
    });

    if (!rateLimit || rateLimit.resetAt < now) {
      return this.prisma.rateLimit.upsert({
        where: {
          key_endpoint: { key, endpoint },
        },
        update: {
          count: 1,
          resetAt,
        },
        create: {
          key,
          endpoint,
          count: 1,
          resetAt,
        },
      });
    }

    const updatedRateLimit = await this.prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { count: { increment: 1 } },
    });

    return {
      ...updatedRateLimit,
      resetAt: rateLimit.resetAt, // Keep the original reset time
    };
  }

  private calculateLimitInfo(rateLimit: { count: number }, resetAt: Date) {
    const remaining = Math.max(0, this.config.max - rateLimit.count);
    const isLimited = rateLimit.count > this.config.max;

    return {
      isLimited,
      limitInfo: {
        limit: this.config.max,
        remaining,
        reset: Math.floor(resetAt.getTime() / 1000),
      },
    };
  }

  async cleanup() {
    try {
      // Delete expired rate limits
      await this.prisma.rateLimit.deleteMany({
        where: {
          resetAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error('Error cleaning up rate limits:', error);
      throw new AppError(ErrorType.DATABASE, 'Failed to clean up rate limits', 500, {
        originalError: error,
      });
    }
  }

  getHeaders(info: RateLimitInfo): Record<string, string> {
    if (!this.config.headers) {
      return {};
    }

    return {
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': info.reset.toString(),
    };
  }
}
