import { z } from 'zod';

// Common validation constants
const MAX_STRING_LENGTH = 255;

// Rate limit configuration schema
export const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().min(1000).default(60000), // Default: 1 minute
  max: z.number().int().min(1).default(100), // Default: 100 requests per window
  message: z.string().optional(),
  statusCode: z.number().int().min(400).max(500).default(429),
  headers: z.boolean().default(true), // Whether to include rate limit info in headers
});

// Rate limit response schema
export const rateLimitResponseSchema = z.object({
  id: z.string().uuid(),
  key: z.string().max(MAX_STRING_LENGTH),
  endpoint: z.string().max(MAX_STRING_LENGTH),
  count: z.number().int().min(0),
  resetAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Rate limit info schema (for headers)
export const rateLimitInfoSchema = z.object({
  limit: z.number().int(),
  remaining: z.number().int(),
  reset: z.number().int(), // Unix timestamp
});

// Export types
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type RateLimitResponse = z.infer<typeof rateLimitResponseSchema>;
export type RateLimitInfo = z.infer<typeof rateLimitInfoSchema>;
