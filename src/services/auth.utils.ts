import { AppError, ErrorType } from '../utils/error.utils';
import type { User, Role, Permission, ApiKey } from '@prisma/client';
import type { UserResponse, ApiKeyResponse } from '../interfaces/auth.interface';

/**
 * Parses a time string (e.g., '1h', '30m') into milliseconds.
 * @param {string} time - The time string to parse.
 * @returns {number} The time in milliseconds.
 * @throws {AppError} If the format is invalid.
 */
export function parseTimeToMs(time: string): number {
  const match = time.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new AppError(ErrorType.VALIDATION, 'Invalid time format', 400);
  }
  const [_, value, unit] = match;
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(value) * multipliers[unit];
}

/**
 * Formats a user object (with roles and permissions) into a UserResponse.
 * @param {User & { roles: (Role & { permissions: Permission[] })[] }} user - The user object.
 * @returns {UserResponse} The formatted user response.
 */
export function formatUserResponse(
  user: User & { roles: (Role & { permissions: Permission[] })[] }
): UserResponse {
  const { password: _, resetToken: __, resetTokenExpiresAt: ___, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    lastLoginAt: userWithoutPassword.lastLoginAt?.toISOString() || null,
    createdAt: userWithoutPassword.createdAt.toISOString(),
    updatedAt: userWithoutPassword.updatedAt.toISOString(),
    roles: userWithoutPassword.roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    })),
  };
}

/**
 * Formats an ApiKey object into an ApiKeyResponse.
 * @param {ApiKey} apiKey - The API key object.
 * @returns {ApiKeyResponse} The formatted API key response.
 */
export function formatApiKeyResponse(apiKey: ApiKey): ApiKeyResponse {
  return {
    id: apiKey.id,
    name: apiKey.name,
    key: apiKey.key,
    expiresAt: apiKey.expiresAt?.toISOString() || null,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}
