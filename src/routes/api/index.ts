import aiRoutes from './ai';

export default async function apiRoutes(fastify) {
  fastify.register(aiRoutes, { prefix: '/ai' });
}
