import { FastifyError } from 'fastify';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logError } from './logger';

/**
 * Custom error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  BAD_REQUEST = 'BAD_REQUEST_ERROR',
}

export interface ErrorDetails {
  code?: string;
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

/**
 * Base class for application errors
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = type;
  }
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: ErrorDetails;
}

/**
 * Handles Prisma errors and converts them to AppError instances
 */
export function handlePrismaError(error: PrismaClientKnownRequestError): AppError {
  const details: ErrorDetails = {
    code: error.code,
  };

  switch (error.code) {
    case 'P2002': {
      const fields = error.meta?.target as string[] | undefined;
      return new AppError(ErrorType.VALIDATION, 'Unique constraint violation', 409, {
        ...details,
        fields,
        constraint: 'unique',
      });
    }
    case 'P2025':
      return new AppError(ErrorType.NOT_FOUND, 'Record not found', 404, details);
    case 'P2003': {
      const field = error.meta?.field_name as string | undefined;
      return new AppError(ErrorType.VALIDATION, 'Foreign key constraint violation', 400, {
        ...details,
        field,
        constraint: 'foreign_key',
      });
    }
    default:
      logError(error, 'Database operation failed');
      return new AppError(ErrorType.DATABASE, 'Database operation failed', 500, details);
  }
}

/**
 * Handles external service errors
 */
export function handleExternalServiceError(error: Error, service: string): AppError {
  logError(error, `External service error: ${service}`);
  return new AppError(ErrorType.EXTERNAL_SERVICE, `${service} service error`, 503, {
    service,
    originalError: error.message,
  });
}

/**
 * Converts any error to a standardized API response
 */
export function formatErrorResponse(error: Error | AppError | FastifyError): ErrorResponse {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      error: error.type,
      message: error.message,
      details: error.details,
    };
  }

  // Handle FastifyError
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return {
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    };
  }

  // Handle unknown errors
  logError(error, 'Unhandled error');
  return {
    statusCode: 500,
    error: ErrorType.INTERNAL,
    message: 'An unexpected error occurred',
  };
}

export class WebhookNotFoundError extends AppError {
  constructor(webhookId: string) {
    super(ErrorType.NOT_FOUND, `Webhook with ID ${webhookId} not found`, 404);
  }
}

export class WebhookDeliveryError extends AppError {
  constructor(webhookId: string, message: string) {
    super(ErrorType.EXTERNAL_SERVICE, `Webhook delivery failed for ${webhookId}: ${message}`, 503);
  }
}

export class WebhookValidationError extends AppError {
  constructor(message: string) {
    super(ErrorType.VALIDATION, `Webhook validation failed: ${message}`, 400);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(ErrorType.UNAUTHORIZED, message, 401);
  }
}

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(ErrorType.NOT_FOUND, `User with ID ${userId} not found`, 404);
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(ErrorType.CONFLICT, `User with email ${email} already exists`, 409);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(ErrorType.UNAUTHORIZED, message, 401);
  }
}

export class InvalidPasswordError extends AppError {
  constructor(message = 'Current password is incorrect') {
    super(ErrorType.BAD_REQUEST, message, 400);
  }
}

export class InvalidApiKeyError extends AppError {
  constructor(message = 'Invalid or expired API key') {
    super(ErrorType.UNAUTHORIZED, message, 401);
  }
}
