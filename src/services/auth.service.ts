import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type {
  RegisterInput,
  LoginInput,
  UserResponse,
  IAuthService,
  AuthConfig,
} from '../interfaces/auth.interface';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  handlePrismaError,
  AppError,
  ErrorType,
} from '../utils/error.utils';
import { MonitorPerformance } from '../utils/performance.utils';
import { UserService } from './user.service';
import { ApiKeyService } from './api-key.service';

@injectable()
export class AuthService implements IAuthService {
  private readonly config: AuthConfig;

  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject(UserService) private readonly userService: UserService,
    @inject(ApiKeyService) private readonly apiKeyService: ApiKeyService,
    @inject('AuthConfig') config: Partial<AuthConfig> = {}
  ) {
    this.config = {
      saltRounds: 10,
      apiKeyLength: 32,
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: '1d',
      resetTokenExpiresIn: '1h',
      ...config,
    };
  }

  /**
   * Registers a new user.
   */
  @MonitorPerformance()
  async register(input: RegisterInput): Promise<UserResponse> {
    try {
      const hashedPassword = await bcrypt.hash(input.password, this.config.saltRounds);
      const user = await this.prisma.user.create({
        data: {
          ...input,
          password: hashedPassword,
        },
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      });
      // Optionally, assign default roles here
      return this.userService.getUserById(user.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Registration failed', 500);
    }
  }

  /**
   * Authenticates a user and returns user details.
   */
  @MonitorPerformance()
  async login(input: LoginInput): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: input.email },
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      });
      if (!user) throw new UserNotFoundError(input.email);
      const isValidPassword = await bcrypt.compare(input.password, user.password);
      if (!isValidPassword) throw new InvalidCredentialsError();
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return this.userService.getUserById(user.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof PrismaClientKnownRequestError) throw handlePrismaError(error);
      throw new AppError(ErrorType.INTERNAL, 'Login failed', 500);
    }
  }

  /**
   * Delegates to ApiKeyService to validate an API key.
   */
  async validateApiKey(key: string) {
    return this.apiKeyService.validateApiKey(key);
  }

  /**
   * Delegates to UserService to get a user by ID.
   */
  async getUserById(userId: string) {
    return this.userService.getUserById(userId);
  }

  /**
   * Delegates to UserService to check if a user has a permission.
   */
  async hasPermission(userId: string, permission: string) {
    return this.userService.hasPermission(userId, permission);
  }

  /**
   * Delegates to UserService to check if a user has a role.
   */
  async hasRole(userId: string, role: string) {
    return this.userService.hasRole(userId, role);
  }
}
