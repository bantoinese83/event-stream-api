import type {
  RegisterInput as SchemaRegisterInput,
  LoginInput as SchemaLoginInput,
  CreateApiKeyInput as SchemaCreateApiKeyInput,
  ChangePasswordInput as SchemaChangePasswordInput,
  ResetPasswordInput as SchemaResetPasswordInput,
  UserResponse as SchemaUserResponse,
  ApiKeyResponse as SchemaApiKeyResponse,
} from '../schemas/auth.schema';

export type RegisterInput = SchemaRegisterInput;
export type LoginInput = SchemaLoginInput;
export type CreateApiKeyInput = SchemaCreateApiKeyInput;
export type ChangePasswordInput = SchemaChangePasswordInput;
export type ResetPasswordInput = SchemaResetPasswordInput;
export type UserResponse = SchemaUserResponse;
export type ApiKeyResponse = SchemaApiKeyResponse;

export interface TokenPayload {
  userId: string;
  exp?: number;
  iat?: number;
}

export interface AuthConfig {
  saltRounds: number;
  apiKeyLength: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  resetTokenExpiresIn: string;
}

export interface IAuthService {
  register(data: RegisterInput): Promise<UserResponse>;
  login(data: LoginInput): Promise<UserResponse>;
}
