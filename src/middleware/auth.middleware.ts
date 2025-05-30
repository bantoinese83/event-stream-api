import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { AuthService } from '../services/auth.service';
import { InvalidTokenError, InvalidApiKeyError } from '../utils/error.utils';
import { logger } from '../utils/logger';

// Extend FastifyRequest to include our custom user type
declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser: {
      userId: string;
      roles: string[];
      permissions: string[];
    };
  }
}

interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ name: string }>;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authService = container.resolve(AuthService);

  try {
    // Check for API key in header
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      try {
        const apiKeyData = await authService.validateApiKey(apiKey);
        if (!apiKeyData) {
          throw new InvalidApiKeyError();
        }

        const user = await authService.getUserById(apiKeyData.id);
        request.authenticatedUser = {
          userId: user.id,
          roles: (user.roles as Role[]).map(role => role.name),
          permissions: (user.roles as Role[]).flatMap(role =>
            role.permissions.map(permission => permission.name)
          ),
        };
        return;
      } catch (error) {
        if (error instanceof InvalidApiKeyError) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: error.message,
          });
        }
        throw error;
      }
    }

    // Check for JWT token
    try {
      const token = await request.jwtVerify<JWTPayload>();
      const user = await authService.getUserById(token.userId);

      request.authenticatedUser = {
        userId: user.id,
        roles: (user.roles as Role[]).map(role => role.name),
        permissions: (user.roles as Role[]).flatMap(role =>
          role.permissions.map(permission => permission.name)
        ),
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error.message,
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Authentication error', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = container.resolve(AuthService);

    try {
      const hasPermission = await authService.hasPermission(
        request.authenticatedUser.userId,
        permission
      );
      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`,
        });
      }
    } catch (error) {
      logger.error('Permission check error', { error, permission });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify permissions',
      });
    }
  };
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = container.resolve(AuthService);

    try {
      const hasRole = await authService.hasRole(request.authenticatedUser.userId, role);
      if (!hasRole) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Missing required role: ${role}`,
        });
      }
    } catch (error) {
      logger.error('Role check error', { error, role });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify role',
      });
    }
  };
}
