import { FastifyPluginAsync } from 'fastify';
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
} from '../../../controllers/auth.controller';
import {
  RegisterInputSchema,
  LoginInputSchema,
  CreateApiKeyInputSchema,
  ChangePasswordInputSchema,
  ResetPasswordRequestSchema,
  ResetPasswordInputSchema,
  UserResponseSchema,
  ApiKeyResponseSchema,
} from '../../../schemas/auth.schema';
import { authenticate } from '../../../middleware/auth.middleware';

const auth: FastifyPluginAsync = async fastify => {
  // Public routes
  fastify.post('/register', {
    schema: {
      body: RegisterInputSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            user: UserResponseSchema,
            token: { type: 'string' },
          },
        },
      },
    },
    handler: register,
  });

  fastify.post('/login', {
    schema: {
      body: LoginInputSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            user: UserResponseSchema,
            token: { type: 'string' },
          },
        },
      },
    },
    handler: login,
  });

  fastify.post('/password-reset/request', {
    schema: {
      body: ResetPasswordRequestSchema,
      response: {
        202: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: requestPasswordReset,
  });

  fastify.post('/password-reset', {
    schema: {
      body: ResetPasswordInputSchema,
      response: {
        204: { type: 'null' },
      },
    },
    handler: resetPassword,
  });

  // Protected routes (require authentication)
  fastify.register(async protectedRoutes => {
    protectedRoutes.addHook('onRequest', authenticate);

    // Profile management
    protectedRoutes.get('/profile', {
      schema: {
        response: {
          200: UserResponseSchema,
        },
      },
      handler: getProfile,
    });

    protectedRoutes.post('/password', {
      schema: {
        body: ChangePasswordInputSchema,
        response: {
          204: { type: 'null' },
        },
      },
      handler: changePassword,
    });

    // API key management
    protectedRoutes.post('/api-keys', {
      schema: {
        body: CreateApiKeyInputSchema,
        response: {
          201: ApiKeyResponseSchema,
        },
      },
      handler: createApiKey,
    });

    protectedRoutes.get('/api-keys', {
      schema: {
        response: {
          200: {
            type: 'array',
            items: ApiKeyResponseSchema,
          },
        },
      },
      handler: listApiKeys,
    });

    protectedRoutes.delete('/api-keys/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          204: { type: 'null' },
        },
      },
      handler: revokeApiKey,
    });
  });
};

export default auth;
