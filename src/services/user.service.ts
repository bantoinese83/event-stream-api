import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type {
  ChangePasswordInput,
  ResetPasswordInput,
  UserResponse,
} from '../interfaces/auth.interface';
import {
  UserNotFoundError,
  InvalidPasswordError,
  InvalidTokenError,
  AppError,
  ErrorType,
  handlePrismaError,
} from '../utils/error.utils';
import { logger } from '../utils/logger';
import { parseTimeToMs, formatUserResponse } from './auth.utils';

@injectable()
export class UserService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  /**
   * Retrieves a user by ID, including roles and permissions.
   * @param id - The user ID
   * @returns The user response object
   */
  async getUserById(id: string): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          roles: { include: { permissions: true } },
        },
      });
      if (!user) throw new UserNotFoundError(id);
      return formatUserResponse(user);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to get user', 500);
    }
  }

  /**
   * Changes a user's password after validating the current password.
   * @param userId - The user ID
   * @param data - The change password input
   */
  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new UserNotFoundError(userId);
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) throw new InvalidPasswordError();
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to change password', 500);
    }
  }

  /**
   * Checks if a user has a specific permission.
   * @param userId - The user ID
   * @param permission - The permission name
   * @returns True if the user has the permission, false otherwise
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { permissions: true } } },
    });
    if (!user) return false;
    return user.roles.some(role => role.permissions.some(p => p.name === permission));
  }

  /**
   * Checks if a user has a specific role.
   * @param userId - The user ID
   * @param role - The role name
   * @returns True if the user has the role, false otherwise
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) return false;
    return user.roles.some(r => r.name === role);
  }

  /**
   * Resets a user's password using a valid reset token.
   * @param data - The reset password input
   */
  async resetPassword(data: ResetPasswordInput): Promise<void> {
    try {
      const userId = await this.validateResetToken(data.token);
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, resetToken: null, resetTokenExpiresAt: null },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to reset password', 500);
    }
  }

  /**
   * Generates a password reset token for a user.
   * @param userId - The user ID
   * @returns The generated reset token
   */
  async generateResetToken(userId: string): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + parseTimeToMs('1h'));
      await this.prisma.user.update({
        where: { id: userId },
        data: { resetToken: token, resetTokenExpiresAt: expiresAt },
      });
      return token;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to generate reset token', 500);
    }
  }

  /**
   * Validates a password reset token and returns the user ID if valid.
   * @param token - The reset token
   * @returns The user ID if valid
   */
  async validateResetToken(token: string): Promise<string> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
      });
      if (!user) throw new InvalidTokenError('Invalid or expired reset token');
      return user.id;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to validate reset token', 500);
    }
  }

  /**
   * Initiates a password reset request for a user by email.
   * @param email - The user's email address
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) return;
      const resetToken = await this.generateResetToken(user.id);
      // TODO: Integrate with email service
      logger.info('Password reset requested', { userId: user.id, email: user.email, resetToken });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Failed to process password reset request', 500);
    }
  }
}
