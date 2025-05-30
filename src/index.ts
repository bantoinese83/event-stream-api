import 'reflect-metadata';
// TODO: Properly configure OpenTelemetry tracing and metrics exporters separately.
// The previous setup was incorrect and caused build errors.
// For now, only prom-client metrics endpoint is enabled in app.ts.
import { container } from './container';
import { createApp } from './app';
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    const app = await createApp();

    await app.listen({
      port: typeof PORT === 'string' ? parseInt(PORT, 10) : PORT,
      host: '0.0.0.0',
    });
    logger.info(`Server is running on port ${PORT}`);

    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down...`);

        // Get Prisma client from container
        const prisma = container.resolve<PrismaClient>(PrismaClient);
        await prisma.$disconnect();

        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
