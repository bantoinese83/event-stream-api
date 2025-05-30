import 'reflect-metadata';
import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { mock } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { AuthService } from '../../services/auth.service';
import { mockPrismaClient } from '../../../tests/setup';
import {
  register,
  login,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getProfile,
} from '../../controllers/auth.controller';
import type {
  RegisterInput,
  LoginInput,
  CreateApiKeyInput,
  ChangePasswordInput,
  ResetPasswordRequestInput,
  ResetPasswordInput,
  UserResponse,
  ApiKeyResponse,
} from '../../schemas/auth.schema';
import { AppError, ErrorType } from '../../utils/error.utils';
import { UserService } from '../../services/user.service';
import { ApiKeyService } from '../../services/api-key.service';

describe('AuthController', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockApiKeyService: jest.Mocked<ApiKeyService>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLogger: FastifyBaseLogger;

  beforeEach(() => {
    mockAuthService = mock<AuthService>();
    mockUserService = mock<UserService>();
    mockApiKeyService = mock<ApiKeyService>();
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnThis(),
      level: 'info',
      silent: jest.fn(),
      bindings: jest.fn().mockReturnValue({}),
      isLevelEnabled: jest.fn().mockReturnValue(true),
    } as jest.Mocked<FastifyBaseLogger>;
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      jwtSign: jest.fn().mockResolvedValue('mock.jwt.token'),
    };

    container.clearInstances();
    container.registerInstance('PrismaClient', mockPrismaClient);
    container.registerInstance('AuthConfig', {
      saltRounds: 10,
      apiKeyLength: 32,
      jwtSecret: 'test-secret',
      jwtExpiresIn: '1h',
      resetTokenExpiresIn: '1h',
    });
    container.registerInstance(AuthService, mockAuthService);
    container.registerInstance(UserService, mockUserService);
    container.registerInstance(ApiKeyService, mockApiKeyService);

    mockRequest = {
      body: {},
      log: mockLogger,
      jwtVerify: jest.fn().mockResolvedValue({ userId: 'user123' }),
    };
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a user successfully', async () => {
      const expectedUser: UserResponse = {
        id: '123',
        email: registerInput.email,
        firstName: registerInput.firstName || null,
        lastName: registerInput.lastName || null,
        roles: [],
        active: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAuthService.register.mockResolvedValue(expectedUser);
      mockRequest.body = registerInput;

      await register(
        mockRequest as FastifyRequest<{ Body: RegisterInput }>,
        mockReply as FastifyReply,
        mockAuthService
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(registerInput);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        user: expectedUser,
        token: 'mock.jwt.token',
      });
    });

    it('should handle email already exists error', async () => {
      mockAuthService.register.mockRejectedValue(
        new AppError(ErrorType.CONFLICT, 'Email already exists', 409)
      );
      mockRequest.body = registerInput;

      await register(
        mockRequest as FastifyRequest<{ Body: RegisterInput }>,
        mockReply as FastifyReply,
        mockAuthService
      );

      expect(mockReply.status).toHaveBeenCalledWith(409);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Conflict',
        message: 'Email already exists',
      });
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully', async () => {
      const expectedUser: UserResponse = {
        id: '123',
        email: loginInput.email,
        firstName: null,
        lastName: null,
        roles: [],
        active: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAuthService.login.mockResolvedValue(expectedUser);
      mockRequest.body = loginInput;

      await login(
        mockRequest as FastifyRequest<{ Body: LoginInput }>,
        mockReply as FastifyReply,
        mockAuthService
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(loginInput);
      expect(mockReply.send).toHaveBeenCalledWith({
        user: expectedUser,
        token: 'mock.jwt.token',
      });
    });

    it('should handle invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      mockRequest.body = loginInput;

      await login(
        mockRequest as FastifyRequest<{ Body: LoginInput }>,
        mockReply as FastifyReply,
        mockAuthService
      );

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });
  });

  describe('createApiKey', () => {
    const createApiKeyInput: CreateApiKeyInput = {
      name: 'Test API Key',
    };

    it('should create an API key successfully', async () => {
      const expectedApiKey: ApiKeyResponse = {
        id: '123',
        name: createApiKeyInput.name,
        key: 'api-key-123',
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiKeyService.createApiKey.mockResolvedValue(expectedApiKey);
      mockRequest.body = createApiKeyInput;

      await createApiKey(
        mockRequest as FastifyRequest<{ Body: CreateApiKeyInput }>,
        mockReply as FastifyReply,
        mockApiKeyService
      );

      expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith('user123', createApiKeyInput);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(expectedApiKey);
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys successfully', async () => {
      const expectedApiKeys: ApiKeyResponse[] = [
        {
          id: '123',
          name: 'Test API Key',
          key: 'api-key-123',
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockApiKeyService.getUserApiKeys.mockResolvedValue(expectedApiKeys);

      await listApiKeys(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockApiKeyService
      );

      expect(mockApiKeyService.getUserApiKeys).toHaveBeenCalledWith('user123');
      expect(mockReply.send).toHaveBeenCalledWith(expectedApiKeys);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key successfully', async () => {
      mockRequest.params = { id: 'key123' };
      mockApiKeyService.deleteApiKey.mockResolvedValue();

      await revokeApiKey(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply,
        mockApiKeyService
      );

      expect(mockApiKeyService.deleteApiKey).toHaveBeenCalledWith('user123', 'key123');
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should handle API key not found error', async () => {
      mockRequest.params = { id: 'key123' };
      mockApiKeyService.deleteApiKey.mockRejectedValue(
        new AppError(ErrorType.NOT_FOUND, 'API key not found', 404)
      );

      await revokeApiKey(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply,
        mockApiKeyService
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'API key not found',
      });
    });
  });

  describe('changePassword', () => {
    const changePasswordInput: ChangePasswordInput = {
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    };

    it('should change password successfully', async () => {
      mockRequest.body = changePasswordInput;
      mockUserService.changePassword.mockResolvedValue();

      await changePassword(
        mockRequest as FastifyRequest<{ Body: ChangePasswordInput }>,
        mockReply as FastifyReply,
        mockUserService
      );

      expect(mockUserService.changePassword).toHaveBeenCalledWith('user123', changePasswordInput);
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should handle incorrect current password', async () => {
      mockRequest.body = changePasswordInput;
      mockUserService.changePassword.mockRejectedValue(
        new AppError(ErrorType.BAD_REQUEST, 'Current password is incorrect', 400)
      );

      await changePassword(
        mockRequest as FastifyRequest<{ Body: ChangePasswordInput }>,
        mockReply as FastifyReply,
        mockUserService
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Current password is incorrect',
      });
    });
  });

  describe('requestPasswordReset', () => {
    const resetRequestInput: ResetPasswordRequestInput = {
      email: 'test@example.com',
    };

    it('should request password reset successfully', async () => {
      mockRequest.body = resetRequestInput;
      mockUserService.requestPasswordReset.mockResolvedValue();

      await requestPasswordReset(
        mockRequest as FastifyRequest<{ Body: ResetPasswordRequestInput }>,
        mockReply as FastifyReply,
        mockUserService
      );

      expect(mockUserService.requestPasswordReset).toHaveBeenCalledWith(resetRequestInput.email);
      expect(mockReply.status).toHaveBeenCalledWith(202);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    });
  });

  describe('resetPassword', () => {
    const resetPasswordInput: ResetPasswordInput = {
      token: 'reset-token-123',
      newPassword: 'newpass123',
    };

    it('should reset password successfully', async () => {
      mockRequest.body = resetPasswordInput;
      mockUserService.resetPassword.mockResolvedValue();

      await resetPassword(
        mockRequest as FastifyRequest<{ Body: ResetPasswordInput }>,
        mockReply as FastifyReply,
        mockUserService
      );

      expect(mockUserService.resetPassword).toHaveBeenCalledWith(resetPasswordInput);
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const expectedUser: UserResponse = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        active: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockUserService.getUserById.mockResolvedValue(expectedUser);

      await getProfile(mockRequest as FastifyRequest, mockReply as FastifyReply, mockUserService);

      expect(mockUserService.getUserById).toHaveBeenCalledWith('user123');
      expect(mockReply.send).toHaveBeenCalledWith(expectedUser);
    });
  });
});
