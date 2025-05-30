import {
  AppError,
  ErrorType,
  handlePrismaError,
  handleExternalServiceError,
  formatErrorResponse,
  WebhookNotFoundError,
  WebhookDeliveryError,
  WebhookValidationError,
  InvalidCredentialsError,
  UserNotFoundError,
  EmailAlreadyExistsError,
  InvalidTokenError,
  InvalidPasswordError,
  InvalidApiKeyError,
} from '../error.utils';

describe('ErrorUtils', () => {
  describe('AppError', () => {
    it('should create an error with status code', () => {
      const error = new AppError(ErrorType.BAD_REQUEST, 'Invalid input', 400);

      expect(error.type).toBe(ErrorType.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe(ErrorType.BAD_REQUEST);
      expect(error instanceof Error).toBe(true);
    });

    it('should create an error with details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError(ErrorType.VALIDATION, 'Invalid email', 400, details);

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('should set type, message, statusCode, and details', () => {
      const err = new AppError(ErrorType.BAD_REQUEST, 'msg', 400, { foo: 'bar' });
      expect(err.type).toBe(ErrorType.BAD_REQUEST);
      expect(err.message).toBe('msg');
      expect(err.statusCode).toBe(400);
      expect(err.details?.foo).toBe('bar');
    });

    it('should create an AppError with correct properties', () => {
      const err = new AppError(ErrorType.NOT_FOUND, 'Not found', 404, { foo: 'bar' });
      expect(err.type).toBe(ErrorType.NOT_FOUND);
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
      expect(err.details?.foo).toBe('bar');
    });

    it('should default statusCode to 500', () => {
      const err = new AppError(ErrorType.INTERNAL, 'fail', 500);
      expect(err.statusCode).toBe(500);
    });
  });

  describe('Custom Errors', () => {
    it('should create WebhookNotFoundError', () => {
      const err = new WebhookNotFoundError('id');
      expect(err.type).toBe(ErrorType.NOT_FOUND);
      expect(err.statusCode).toBe(404);
    });
    it('should create WebhookDeliveryError', () => {
      const err = new WebhookDeliveryError('id', 'fail');
      expect(err.type).toBe(ErrorType.EXTERNAL_SERVICE);
      expect(err.statusCode).toBe(503);
    });
    it('should create WebhookValidationError', () => {
      const err = new WebhookValidationError('bad');
      expect(err.type).toBe(ErrorType.VALIDATION);
      expect(err.statusCode).toBe(400);
    });
    it('should create InvalidCredentialsError', () => {
      const err = new InvalidCredentialsError();
      expect(err.type).toBe(ErrorType.UNAUTHORIZED);
      expect(err.statusCode).toBe(401);
    });
    it('should create UserNotFoundError', () => {
      const err = new UserNotFoundError('id');
      expect(err.type).toBe(ErrorType.NOT_FOUND);
      expect(err.statusCode).toBe(404);
    });
    it('should create EmailAlreadyExistsError', () => {
      const err = new EmailAlreadyExistsError('a@b.com');
      expect(err.type).toBe(ErrorType.CONFLICT);
      expect(err.statusCode).toBe(409);
    });
    it('should create InvalidTokenError', () => {
      const err = new InvalidTokenError();
      expect(err.type).toBe(ErrorType.UNAUTHORIZED);
      expect(err.statusCode).toBe(401);
    });
    it('should create InvalidPasswordError', () => {
      const err = new InvalidPasswordError();
      expect(err.type).toBe(ErrorType.BAD_REQUEST);
      expect(err.statusCode).toBe(400);
    });
    it('should create InvalidApiKeyError', () => {
      const err = new InvalidApiKeyError();
      expect(err.type).toBe(ErrorType.UNAUTHORIZED);
      expect(err.statusCode).toBe(401);
    });
  });

  describe('handlePrismaError', () => {
    it('should handle unique constraint violation (P2002)', () => {
      const err = handlePrismaError({ code: 'P2002', meta: { target: ['email'] } } as any);
      expect(err.type).toBe(ErrorType.VALIDATION);
      expect(err.statusCode).toBe(409);
      expect(err.details?.constraint).toBe('unique');
    });
    it('should handle record not found (P2025)', () => {
      const err = handlePrismaError({ code: 'P2025' } as any);
      expect(err.type).toBe(ErrorType.NOT_FOUND);
      expect(err.statusCode).toBe(404);
    });
    it('should handle foreign key violation (P2003)', () => {
      const err = handlePrismaError({ code: 'P2003', meta: { field_name: 'userId' } } as any);
      expect(err.type).toBe(ErrorType.VALIDATION);
      expect(err.statusCode).toBe(400);
      expect(err.details?.constraint).toBe('foreign_key');
    });
    it('should handle unknown code', () => {
      const err = handlePrismaError({ code: 'P9999' } as any);
      expect(err.type).toBe(ErrorType.DATABASE);
      expect(err.statusCode).toBe(500);
    });
  });

  describe('handleExternalServiceError', () => {
    it('should wrap error as AppError', () => {
      const err = handleExternalServiceError(new Error('fail'), 'svc');
      expect(err.type).toBe(ErrorType.EXTERNAL_SERVICE);
      expect(err.statusCode).toBe(503);
      expect(err.details?.service).toBe('svc');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format AppError', () => {
      const error = new AppError(ErrorType.BAD_REQUEST, 'Invalid input', 400);
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        statusCode: 400,
        error: ErrorType.BAD_REQUEST,
        message: 'Invalid input',
      });
    });

    it('should format AppError with details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError(ErrorType.VALIDATION, 'Invalid email', 400, details);
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        statusCode: 400,
        error: ErrorType.VALIDATION,
        message: 'Invalid email',
        details,
      });
    });

    it('should format FastifyError', () => {
      const error = {
        name: 'ValidationError',
        message: 'Invalid request',
        statusCode: 400,
      };
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        statusCode: 400,
        error: 'ValidationError',
        message: 'Invalid request',
      });
    });

    it('should format unknown error', () => {
      const error = new Error('Something went wrong');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        statusCode: 500,
        error: ErrorType.INTERNAL,
        message: 'An unexpected error occurred',
      });
    });

    it('should format undefined error', () => {
      const response = formatErrorResponse(new Error());

      expect(response).toEqual({
        statusCode: 500,
        error: ErrorType.INTERNAL,
        message: 'An unexpected error occurred',
      });
    });

    it('should handle different error types', () => {
      const errorTypes = [
        { type: ErrorType.UNAUTHORIZED, status: 401, message: 'Unauthorized' },
        { type: ErrorType.FORBIDDEN, status: 403, message: 'Forbidden' },
        { type: ErrorType.NOT_FOUND, status: 404, message: 'Not Found' },
        { type: ErrorType.CONFLICT, status: 409, message: 'Conflict' },
        { type: ErrorType.RATE_LIMIT, status: 429, message: 'Too Many Requests' },
        { type: ErrorType.INTERNAL, status: 500, message: 'Internal Error' },
      ];

      errorTypes.forEach(({ type, status, message }) => {
        const error = new AppError(type, message, status);
        const response = formatErrorResponse(error);

        expect(response).toEqual({
          statusCode: status,
          error: type,
          message,
        });
      });
    });

    it('should convert AppError to response', () => {
      const err = new AppError(ErrorType.VALIDATION, 'bad', 400, { field: 'x' });
      const res = formatErrorResponse(err);
      expect(res.error).toBe(ErrorType.VALIDATION);
      expect(res.message).toBe('bad');
      expect(res.statusCode).toBe(400);
      expect(res.details?.field).toBe('x');
    });

    it('should convert generic error to response', () => {
      const err = new Error('fail');
      const res = formatErrorResponse(err);
      expect(res.error).toBe(ErrorType.INTERNAL);
      expect(res.statusCode).toBe(500);
    });
  });
});
