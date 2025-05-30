import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

interface RateLimitConfig {
  statusCode?: number;
  headers?: boolean;
  windowMs?: number;
  max?: number;
  message?: string;
}

const rateLimiter: FastifyPluginAsync<RateLimitConfig> = async (
  fastify: FastifyInstance,
  config
) => {
  const windowMs = config.windowMs || 60 * 1000; // 1 minute
  const max = config.max || 100; // limit each IP to 100 requests per windowMs
  const statusCode = config.statusCode || 429;
  const message = config.message || 'Too many requests, please try again later.';

  const hits = new Map<string, { count: number; resetTime: number }>();

  fastify.addHook('onRequest', async (request, reply) => {
    const ip = request.ip;
    const now = Date.now();
    const hit = hits.get(ip);

    if (!hit || now > hit.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      hit.count++;
      if (hit.count > max) {
        reply.status(statusCode).send({ error: message });
        return reply;
      }
    }
  });
};

export default fp(rateLimiter, {
  name: 'rate-limiter',
  fastify: '4.x',
});
