import 'dotenv/config';
import { z } from 'zod';

// Environment-specific validation schemas
const developmentSchema = z.object({
  NODE_ENV: z.literal('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
});

const testSchema = z.object({
  NODE_ENV: z.literal('test'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('error'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(false),
});

const productionSchema = z.object({
  NODE_ENV: z.literal('production'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
});

// Select schema based on NODE_ENV
const getConfigSchema = () => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return developmentSchema;
    case 'test':
      return testSchema;
    case 'production':
      return productionSchema;
    default:
      return developmentSchema;
  }
};

const config = getConfigSchema().parse(process.env);

export type Config = typeof config;
export default config;
