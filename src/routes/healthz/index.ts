import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { container } from '../../container';

export async function healthzRoutes(fastify: FastifyInstance) {
  const prisma = container.resolve<PrismaClient>(PrismaClient);

  fastify.get('/healthz', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ok' });
    } catch {
      return reply.status(500).send({ status: 'error' });
    }
  });
}
