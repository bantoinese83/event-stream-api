import { container } from './container';
import { PrismaClient } from '@prisma/client';
import { EventService } from './services/event.service';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ApiKeyService } from './services/api-key.service';

describe('container', () => {
  it('should resolve PrismaClient', () => {
    const prisma = container.resolve(PrismaClient);
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('should resolve EventService', () => {
    const service = container.resolve(EventService);
    expect(service).toBeInstanceOf(EventService);
  });

  it('should resolve AuthService', () => {
    const service = container.resolve(AuthService);
    expect(service).toBeInstanceOf(AuthService);
  });

  it('should resolve UserService', () => {
    const service = container.resolve(UserService);
    expect(service).toBeInstanceOf(UserService);
  });

  it('should resolve ApiKeyService', () => {
    const service = container.resolve(ApiKeyService);
    expect(service).toBeInstanceOf(ApiKeyService);
  });

  it('should return the same PrismaClient instance (singleton)', () => {
    const prisma1 = container.resolve(PrismaClient);
    const prisma2 = container.resolve(PrismaClient);
    expect(prisma1).toBe(prisma2);
  });
});
