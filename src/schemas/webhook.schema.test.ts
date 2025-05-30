import * as schema from './webhook.schema';

describe('webhook.schema', () => {
  it('should import all schemas and types', () => {
    expect(schema.createWebhookSchema).toBeDefined();
    expect(schema.updateWebhookSchema).toBeDefined();
    expect(schema.webhookResponseSchema).toBeDefined();
    expect(schema.webhookDeliveryResponseSchema).toBeDefined();
    expect(schema.webhookDeliveryResultSchema).toBeDefined();
    expect(schema.listWebhooksSchema).toBeDefined();
    expect(schema.listWebhookDeliveriesSchema).toBeDefined();
  });
}); 