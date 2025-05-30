import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class TestDatabase {
  private container?: StartedPostgreSqlContainer;
  private prisma?: PrismaClient;

  async start(): Promise<PrismaClient> {
    const container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    this.container = container;

    // Set environment variables for Prisma
    process.env.DATABASE_URL = container.getConnectionUri();

    // Generate Prisma Client
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Initialize Prisma client
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Apply migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Test the connection by making a simple query
    try {
      await this.prisma.user.findFirst();
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }

    return this.prisma;
  }

  async stop(): Promise<void> {
    if (this.container) {
      await this.container.stop();
    }
  }

  async cleanup(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }

    // Delete all data from tables in the correct order
    await this.prisma.$transaction([
      this.prisma.webhookDelivery.deleteMany(),
      this.prisma.webhook.deleteMany(),
      this.prisma.event.deleteMany(),
      this.prisma.rateLimit.deleteMany(),
      this.prisma.apiKey.deleteMany(),
      this.prisma.permission.deleteMany(),
      this.prisma.role.deleteMany(),
      this.prisma.user.deleteMany(),
    ]);
  }
}

export const testDatabase = new TestDatabase();
