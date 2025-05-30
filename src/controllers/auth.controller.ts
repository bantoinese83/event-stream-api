import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ApiKeyService } from '../services/api-key.service';
import { AppError } from '../utils/error.utils';
import type {
  RegisterInput,
  LoginInput,
  CreateApiKeyInput,
  ChangePasswordInput,
  ResetPasswordRequestInput,
  ResetPasswordInput,
} from '../schemas/auth.schema';

const defaultAuthService = container.resolve(AuthService);
const defaultUserService = container.resolve(UserService);
const defaultApiKeyService = container.resolve(ApiKeyService);

interface JWTPayload {
  userId: string;
}

/**
 * Registers a new user and returns the user and JWT token.
 * @param request - Fastify request with RegisterInput body
 * @param reply - Fastify reply
 * @param authService - AuthService instance (optional, for testing)
 */
export async function register(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
  authService: AuthService = defaultAuthService
) {
  try {
    const user = await authService.register(request.body);
    const token = await reply.jwtSign({ userId: user.id });
    return reply.status(201).send({ user, token });
  } catch (error) {
    request.log.error(error, 'Failed to register user');
    if (error instanceof AppError && error.message === 'Email already exists') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Email already exists',
      });
    }
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
}

/**
 * Authenticates a user and returns the user and JWT token.
 * @param request - Fastify request with LoginInput body
 * @param reply - Fastify reply
 * @param authService - AuthService instance (optional, for testing)
 */
export async function login(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
  authService: AuthService = defaultAuthService
) {
  try {
    const user = await authService.login(request.body);
    const token = await reply.jwtSign({ userId: user.id });
    return reply.send({ user, token });
  } catch (error) {
    request.log.error(error, 'Failed to login');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
  }
}

/**
 * Creates a new API key for the authenticated user.
 * @param request - Fastify request with CreateApiKeyInput body
 * @param reply - Fastify reply
 * @param apiKeyService - ApiKeyService instance (optional, for testing)
 */
export async function createApiKey(
  request: FastifyRequest<{ Body: CreateApiKeyInput }>,
  reply: FastifyReply,
  apiKeyService: ApiKeyService = defaultApiKeyService
) {
  try {
    const token = await request.jwtVerify<JWTPayload>();
    const apiKey = await apiKeyService.createApiKey(token.userId, request.body);
    return reply.status(201).send(apiKey);
  } catch (error) {
    request.log.error(error, 'Failed to create API key');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create API key',
    });
  }
}

/**
 * Lists all API keys for the authenticated user.
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param apiKeyService - ApiKeyService instance (optional, for testing)
 */
export async function listApiKeys(
  request: FastifyRequest,
  reply: FastifyReply,
  apiKeyService: ApiKeyService = defaultApiKeyService
) {
  try {
    const token = await request.jwtVerify<JWTPayload>();
    const apiKeys = await apiKeyService.getUserApiKeys(token.userId);
    return reply.send(apiKeys);
  } catch (error) {
    request.log.error(error, 'Failed to list API keys');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list API keys',
    });
  }
}

/**
 * Revokes (deletes) an API key for the authenticated user.
 * @param request - Fastify request with API key id param
 * @param reply - Fastify reply
 * @param apiKeyService - ApiKeyService instance (optional, for testing)
 */
export async function revokeApiKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
  apiKeyService: ApiKeyService = defaultApiKeyService
) {
  try {
    const token = await request.jwtVerify<JWTPayload>();
    await apiKeyService.deleteApiKey(token.userId, request.params.id);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to revoke API key');
    if (error instanceof AppError && error.message === 'API key not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'API key not found',
      });
    }
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key',
    });
  }
}

/**
 * Changes the password for the authenticated user.
 * @param request - Fastify request with ChangePasswordInput body
 * @param reply - Fastify reply
 * @param userService - UserService instance (optional, for testing)
 */
export async function changePassword(
  request: FastifyRequest<{ Body: ChangePasswordInput }>,
  reply: FastifyReply,
  userService: UserService = defaultUserService
) {
  try {
    const token = await request.jwtVerify<JWTPayload>();
    await userService.changePassword(token.userId, request.body);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to change password');
    if (error instanceof AppError && error.message === 'Current password is incorrect') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Current password is incorrect',
      });
    }
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to change password',
    });
  }
}

/**
 * Initiates a password reset request for a user by email.
 * @param request - Fastify request with ResetPasswordRequestInput body
 * @param reply - Fastify reply
 * @param userService - UserService instance (optional, for testing)
 */
export async function requestPasswordReset(
  request: FastifyRequest<{ Body: ResetPasswordRequestInput }>,
  reply: FastifyReply,
  userService: UserService = defaultUserService
) {
  try {
    await userService.requestPasswordReset(request.body.email);
    return reply.status(202).send({
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  } catch (error) {
    request.log.error(error, 'Failed to request password reset');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to process password reset request',
    });
  }
}

/**
 * Resets a user's password using a valid reset token.
 * @param request - Fastify request with ResetPasswordInput body
 * @param reply - Fastify reply
 * @param userService - UserService instance (optional, for testing)
 */
export async function resetPassword(
  request: FastifyRequest<{ Body: ResetPasswordInput }>,
  reply: FastifyReply,
  userService: UserService = defaultUserService
) {
  try {
    await userService.resetPassword(request.body);
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to reset password');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to reset password',
    });
  }
}

/**
 * Gets the profile of the authenticated user.
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param userService - UserService instance (optional, for testing)
 */
export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply,
  userService: UserService = defaultUserService
) {
  try {
    const token = await request.jwtVerify<JWTPayload>();
    const user = await userService.getUserById(token.userId);
    return reply.send(user);
  } catch (error) {
    request.log.error(error, 'Failed to get user profile');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get user profile',
    });
  }
}
