import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { EventService } from './services/event.service';
import { ExportService } from './services/export.service';
import { RateLimitService } from './services/rate-limit.service';
import { WebhookService } from './services/webhook.service';
import { AuthService } from './services/auth.service';
import { TimeSeriesAggregator } from './utils/time-series.utils';
import { WebhookRepository } from './repositories/webhook.repository';
import { EventRepository } from './repositories/event.repository';
import type { AuthConfig } from './interfaces/auth.interface';
import { UserService } from './services/user.service';
import { ApiKeyService } from './services/api-key.service';

// Initialize Prisma client
const prisma = new PrismaClient();

// Register Prisma client
container.register(PrismaClient, {
  useValue: prisma,
});

// Register auth config
container.register<AuthConfig>('AuthConfig', {
  useValue: {
    saltRounds: 10,
    apiKeyLength: 32,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: '1d',
    resetTokenExpiresIn: '1h',
  },
});

// Register repositories
container.register(WebhookRepository, {
  useClass: WebhookRepository,
});

container.register(EventRepository, {
  useClass: EventRepository,
});

// Register services
container.register(AuthService, {
  useClass: AuthService,
});

container.register(EventService, {
  useClass: EventService,
});

container.register(ExportService, {
  useClass: ExportService,
});

container.register(RateLimitService, {
  useClass: RateLimitService,
});

container.register(WebhookService, {
  useClass: WebhookService,
});

// Register utilities
container.register(TimeSeriesAggregator, {
  useClass: TimeSeriesAggregator,
});

// Register dependencies for tests
container.register('AuthConfig', {
  useValue: {
    saltRounds: 10,
    apiKeyLength: 32,
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1d',
    resetTokenExpiresIn: '1h',
  },
});

container.register(UserService, {
  useClass: UserService,
});

container.register(ApiKeyService, {
  useClass: ApiKeyService,
});

export { container };
