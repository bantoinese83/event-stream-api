import * as schema from './event.schema';

describe('event.schema', () => {
  it('should import all schemas and types', () => {
    expect(schema.createEventSchema).toBeDefined();
    expect(schema.createBatchEventsSchema).toBeDefined();
    expect(schema.eventResponseSchema).toBeDefined();
    expect(schema.aggregationQuerySchema).toBeDefined();
    expect(schema.advancedAnalyticsSchema).toBeDefined();
    expect(schema.rawEventsQuerySchema).toBeDefined();
    expect(schema.eventMetadataSchema).toBeDefined();
    expect(schema.eventDataSchema).toBeDefined();
  });
}); 