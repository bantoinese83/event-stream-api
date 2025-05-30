import 'jest-extended';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

// Global test timeout
jest.setTimeout(30000);

// Create a mock PrismaClient
const mockPrismaClient = mockDeep<PrismaClient>();

// Register dependencies
container.registerInstance('PrismaClient', mockPrismaClient);
container.registerInstance('AuthConfig', {
  saltRounds: 10,
  apiKeyLength: 32,
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1h',
  resetTokenExpiresIn: '1h',
});

// Mock prisma client for unit tests
export const prismaMock = mockDeep<PrismaClient>();
beforeEach(() => {
  mockReset(prismaMock);
});

// Global test environment setup
beforeAll(async () => {
  // Add any global setup here
});

// Global test environment teardown
afterAll(async () => {
  // Add any global teardown here
});

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Export the mock for use in tests
export { mockPrismaClient };
