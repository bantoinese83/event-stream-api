import { parseTimeToMs, formatUserResponse, formatApiKeyResponse } from '../auth.utils';
import { AppError, ErrorType } from '../../utils/error.utils';

describe('parseTimeToMs', () => {
  it('should parse ms, s, m, h, d', () => {
    expect(parseTimeToMs('100ms')).toBe(100);
    expect(parseTimeToMs('2s')).toBe(2000);
    expect(parseTimeToMs('3m')).toBe(180000);
    expect(parseTimeToMs('1h')).toBe(3600000);
    expect(parseTimeToMs('1d')).toBe(86400000);
  });
  it('should throw on invalid format', () => {
    expect(() => parseTimeToMs('bad')).toThrow(AppError);
    try {
      parseTimeToMs('10x');
    } catch (e) {
      const err = e as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.type).toBe(ErrorType.VALIDATION);
    }
  });
});

describe('formatUserResponse', () => {
  const baseUser = {
    id: '1',
    email: 'a@b.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    lastLoginAt: new Date('2023-01-02T00:00:00Z'),
    roles: [
      {
        id: 'r1',
        name: 'admin',
        description: 'desc',
        permissions: [{ id: 'p1', name: 'perm', description: 'perm desc' }],
      },
    ],
    password: 'secret',
    resetToken: 'tok',
    resetTokenExpiresAt: new Date(),
  };
  it('should format user and omit sensitive fields', () => {
    const result = formatUserResponse(baseUser as any);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('resetToken');
    expect(result).not.toHaveProperty('resetTokenExpiresAt');
    expect(result.roles[0].name).toBe('admin');
    expect(result.lastLoginAt).toBe('2023-01-02T00:00:00.000Z');
  });
  it('should handle missing lastLoginAt', () => {
    const user = { ...baseUser, lastLoginAt: undefined };
    const result = formatUserResponse(user as any);
    expect(result.lastLoginAt).toBeNull();
  });
});

describe('formatApiKeyResponse', () => {
  const baseKey = {
    id: 'k1',
    name: 'key',
    key: 'secret',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    expiresAt: new Date('2023-01-02T00:00:00Z'),
    lastUsedAt: new Date('2023-01-03T00:00:00Z'),
  };
  it('should format API key with all fields', () => {
    const result = formatApiKeyResponse(baseKey as any);
    expect(result.expiresAt).toBe('2023-01-02T00:00:00.000Z');
    expect(result.lastUsedAt).toBe('2023-01-03T00:00:00.000Z');
  });
  it('should handle missing optional fields', () => {
    const key = { ...baseKey, expiresAt: undefined, lastUsedAt: undefined };
    const result = formatApiKeyResponse(key as any);
    expect(result.expiresAt).toBeNull();
    expect(result.lastUsedAt).toBeNull();
  });
});
