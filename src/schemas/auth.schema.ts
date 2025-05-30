import { Static, Type } from '@sinclair/typebox';

// Common validation constants
const PASSWORD_MIN_LENGTH = 8;

// Registration schema
export const RegisterInputSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: PASSWORD_MIN_LENGTH }),
  firstName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String()),
});

// Login schema
export const LoginInputSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
});

// API key creation schema
export const CreateApiKeyInputSchema = Type.Object({
  name: Type.String(),
  expiresAt: Type.Optional(Type.String({ format: 'date-time' })),
});

// Password change schema
export const ChangePasswordInputSchema = Type.Object({
  currentPassword: Type.String(),
  newPassword: Type.String({ minLength: PASSWORD_MIN_LENGTH }),
});

// Password reset request schema
export const ResetPasswordRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
});

// Password reset schema
export const ResetPasswordInputSchema = Type.Object({
  token: Type.String(),
  newPassword: Type.String({ minLength: PASSWORD_MIN_LENGTH }),
});

// User response schema
export const UserResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  firstName: Type.Union([Type.String(), Type.Null()]),
  lastName: Type.Union([Type.String(), Type.Null()]),
  roles: Type.Array(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      description: Type.Union([Type.String(), Type.Null()]),
    })
  ),
  active: Type.Boolean(),
  lastLoginAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

// API key response schema
export const ApiKeyResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  key: Type.String(),
  expiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  lastUsedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

// Export types
export type RegisterInput = Static<typeof RegisterInputSchema>;
export type LoginInput = Static<typeof LoginInputSchema>;
export type CreateApiKeyInput = Static<typeof CreateApiKeyInputSchema>;
export type ChangePasswordInput = Static<typeof ChangePasswordInputSchema>;
export type ResetPasswordRequestInput = Static<typeof ResetPasswordRequestSchema>;
export type ResetPasswordInput = Static<typeof ResetPasswordInputSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;
export type ApiKeyResponse = Static<typeof ApiKeyResponseSchema>;

export const TokenPayload = Type.Object({
  userId: Type.String(),
  exp: Type.Optional(Type.Number()),
  iat: Type.Optional(Type.Number()),
});

export const PermissionResponse = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
});

export const RoleResponse = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  permissions: Type.Array(PermissionResponse),
});
