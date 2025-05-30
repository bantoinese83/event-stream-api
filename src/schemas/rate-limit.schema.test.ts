import * as schema from './rate-limit.schema';

describe('rate-limit.schema', () => {
  it('should import all schemas and types', () => {
    expect(schema.rateLimitConfigSchema).toBeDefined();
    expect(schema.rateLimitResponseSchema).toBeDefined();
    expect(schema.rateLimitInfoSchema).toBeDefined();
  });
}); 