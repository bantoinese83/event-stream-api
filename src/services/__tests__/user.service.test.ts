const mockLogger = { info: jest.fn() };
jest.mock('../../utils/logger', () => ({ logger: mockLogger }));

import { UserService } from '../user.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  AppError,
  ErrorType,
  UserNotFoundError,
  InvalidPasswordError,
  InvalidTokenError,
} from '../../utils/error.utils';

jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let userService: UserService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    userService = new UserService(prisma as unknown as PrismaClient);
  });

  describe('getUserById', () => {
    it('should return formatted user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await userService.getUserById('1');
      expect(result.id).toBe('1');
    });
    it('should throw UserNotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(userService.getUserById('bad')).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('changePassword', () => {
    it('should change password if current is valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', password: 'hash' });
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('newhash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      await expect(
        userService.changePassword('1', { currentPassword: 'old', newPassword: 'new' })
      ).resolves.toBeUndefined();
    });
    it('should throw InvalidPasswordError if current is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', password: 'hash' });
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        userService.changePassword('1', { currentPassword: 'bad', newPassword: 'new' })
      ).rejects.toThrow(InvalidPasswordError);
    });
    it('should throw UserNotFoundError if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        userService.changePassword('bad', { currentPassword: 'x', newPassword: 'y' })
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        roles: [{ permissions: [{ name: 'perm' }] }],
      });
      const result = await userService.hasPermission('1', 'perm');
      expect(result).toBe(true);
    });
    it('should return false if user does not have permission', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        roles: [{ permissions: [{ name: 'other' }] }],
      });
      const result = await userService.hasPermission('1', 'perm');
      expect(result).toBe(false);
    });
    it('should return false if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await userService.hasPermission('bad', 'perm');
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ roles: [{ name: 'admin' }] });
      const result = await userService.hasRole('1', 'admin');
      expect(result).toBe(true);
    });
    it('should return false if user does not have role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ roles: [{ name: 'user' }] });
      const result = await userService.hasRole('1', 'admin');
      expect(result).toBe(false);
    });
    it('should return false if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await userService.hasRole('bad', 'admin');
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should reset password if token is valid', async () => {
      userService.validateResetToken = jest.fn().mockResolvedValue('1');
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      await expect(
        userService.resetPassword({ token: 'tok', newPassword: 'new' })
      ).resolves.toBeUndefined();
    });
    it('should throw on error', async () => {
      userService.validateResetToken = jest
        .fn()
        .mockRejectedValue(new AppError(ErrorType.INTERNAL, 'fail', 500));
      await expect(userService.resetPassword({ token: 'tok', newPassword: 'new' })).rejects.toThrow(
        'fail'
      );
    });
  });

  describe('generateResetToken', () => {
    it('should generate and store a reset token', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      const token = await userService.generateResetToken('1');
      expect(typeof token).toBe('string');
    });
    it('should throw on error', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(
        new AppError(ErrorType.INTERNAL, 'fail', 500)
      );
      await expect(userService.generateResetToken('1')).rejects.toThrow('fail');
    });
  });

  describe('validateResetToken', () => {
    it('should return userId if token is valid', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
      const userId = await userService.validateResetToken('tok');
      expect(userId).toBe('1');
    });
    it('should throw InvalidTokenError if token is invalid', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(userService.validateResetToken('bad')).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should log info if user exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'a@b.com' });
      userService.generateResetToken = jest.fn().mockResolvedValue('tok');
      await userService.requestPasswordReset('a@b.com');
      expect(mockLogger.info).toHaveBeenCalled();
    });
    it('should do nothing if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      userService.generateResetToken = jest.fn();
      await userService.requestPasswordReset('none@b.com');
      expect(userService.generateResetToken).not.toHaveBeenCalled();
    });
  });
});
