import * as schema from './auth.schema';

describe('auth.schema', () => {
  it('should import all schemas and types', () => {
    expect(schema.RegisterInputSchema).toBeDefined();
    expect(schema.LoginInputSchema).toBeDefined();
    expect(schema.CreateApiKeyInputSchema).toBeDefined();
    expect(schema.ChangePasswordInputSchema).toBeDefined();
    expect(schema.ResetPasswordRequestSchema).toBeDefined();
    expect(schema.ResetPasswordInputSchema).toBeDefined();
    expect(schema.UserResponseSchema).toBeDefined();
    expect(schema.ApiKeyResponseSchema).toBeDefined();
    expect(schema.TokenPayload).toBeDefined();
    expect(schema.PermissionResponse).toBeDefined();
    expect(schema.RoleResponse).toBeDefined();
  });
}); 