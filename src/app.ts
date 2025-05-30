import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import autoload from '@fastify/autoload';
import sensible from '@fastify/sensible';
import auth from '@fastify/auth';
import { join } from 'path';
import config from './config';
import { container } from './container';
import { logger } from './utils/logger';
import promClient from 'prom-client';

export async function createApp() {
  const _container = container;
  const app = fastify({ logger });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  await app.register(sensible);
  await app.register(auth);

  // Autoload plugins (e.g., rate limiter)
  await app.register(autoload, {
    dir: join(__dirname, 'plugins'),
    options: { prefix: '/plugins' },
    forceESM: false,
  });

  // Autoload routes
  await app.register(autoload, {
    dir: join(__dirname, 'routes'),
    options: { prefix: '/' },
    forceESM: false,
  });

  // Prometheus metrics endpoint
  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', promClient.register.contentType);
    return promClient.register.metrics();
  });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  // Readiness endpoint
  app.get('/readyz', async () => {
    // Optionally, check DB or other dependencies here
    return { status: 'ready' };
  });

  // Liveness endpoint
  app.get('/livez', async () => {
    return { status: 'alive' };
  });

  return app;
}
