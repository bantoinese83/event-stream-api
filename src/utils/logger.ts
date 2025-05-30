import { FastifyBaseLogger } from 'fastify';
import pino from 'pino';
import config from '../config';

/**
 * Enhanced logger with consistent formatting and error tracking
 */
export const logger: FastifyBaseLogger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
  formatters: {
    level: label => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    env: config.NODE_ENV,
  },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
});

/**
 * Error logging helper with consistent formatting
 */
export function logError(
  error: Error,
  context: string,
  additionalInfo: Record<string, unknown> = {}
) {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      ...additionalInfo,
    },
    context,
  });
}

/**
 * Performance logging helper
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata: Record<string, unknown> = {}
) {
  logger.info({
    operation,
    durationMs,
    ...metadata,
    type: 'performance',
  });
}

/**
 * Audit logging helper for tracking important operations
 */
export function logAudit(action: string, userId: string, details: Record<string, unknown> = {}) {
  logger.info({
    action,
    userId,
    ...details,
    type: 'audit',
  });
}

export default {
  logger,
  logError,
  logPerformance,
  logAudit,
};
