import fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { authenticate, requirePermission, requireRole } from '../auth.middleware';
import { container } from 'tsyringe';
import { InvalidApiKeyError, InvalidTokenError } from '../../utils/error.utils';

const mockAuthService = {
  validateApiKey: jest.fn(),
  getUserById: jest.fn(),
  hasPermission: jest.fn(),
  hasRole: jest.fn(),
};

describe('auth.middleware', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = fastify();
    await app.register(fastifyJwt, { secret: 'test' });
    app.decorateRequest('authenticatedUser', null);
    app.addHook('preHandler', authenticate);
    app.get('/test', async req => ({ user: req.authenticatedUser }));
    jest.clearAllMocks();
    jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
  });

  it('should return 401 if API key is invalid', async () => {
    mockAuthService.validateApiKey.mockImplementation(() => {
      throw new InvalidApiKeyError();
    });
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-api-key': 'bad' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should authenticate with valid API key', async () => {
    mockAuthService.validateApiKey.mockResolvedValue({ id: 'user1' });
    mockAuthService.getUserById.mockResolvedValue({
      id: 'user1',
      roles: [{ name: 'admin', permissions: [{ name: 'perm' }] }],
    });
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-api-key': 'good' },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).user.userId).toBe('user1');
    expect(JSON.parse(response.body).user.roles).toContain('admin');
    expect(JSON.parse(response.body).user.permissions).toContain('perm');
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthService.validateApiKey.mockImplementation(() => {
      throw new Error('Unexpected');
    });
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-api-key': 'err' },
    });
    expect(response.statusCode).toBe(500);
  });
});

describe('auth.middleware JWT', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = fastify();
    await app.register(fastifyJwt, { secret: 'test' });
    app.decorateRequest('authenticatedUser', null);
    app.addHook('preHandler', authenticate);
    app.get('/test', async req => ({ user: req.authenticatedUser }));
    jest.clearAllMocks();
    jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
  });

  describe('invalid JWT', () => {
    beforeEach(async () => {
      app.addHook('onRequest', (req, _reply, done) => {
        req.jwtVerify = async () => {
          throw new InvalidTokenError();
        };
        done();
      });
      jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
      await app.ready();
    });
    it('should return 401 if JWT is invalid', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { authorization: 'Bearer bad' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('valid JWT', () => {
    beforeEach(async () => {
      app.addHook('onRequest', (req, _reply, done) => {
        req.jwtVerify = async () => ({ userId: 'user2' });
        done();
      });
      jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
      mockAuthService.getUserById.mockResolvedValue({
        id: 'user2',
        roles: [{ name: 'user', permissions: [{ name: 'perm2' }] }],
      });
      await app.ready();
    });
    it('should authenticate with valid JWT', async () => {
      const token = app.jwt.sign({ userId: 'user2' });
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).user.userId).toBe('user2');
      expect(JSON.parse(response.body).user.roles).toContain('user');
      expect(JSON.parse(response.body).user.permissions).toContain('perm2');
    });
  });
});

describe('requirePermission', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = fastify();
    await app.register(fastifyJwt, { secret: 'test' });
    app.decorateRequest('authenticatedUser', {
      userId: 'user1',
      roles: ['admin'],
      permissions: ['perm'],
    });
    app.addHook('preHandler', requirePermission('perm'));
    app.get('/test', async req => ({ user: req.authenticatedUser }));
    jest.clearAllMocks();
    jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
  });

  it('should return 403 if user lacks permission', async () => {
    mockAuthService.hasPermission.mockResolvedValue(false);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(403);
  });

  it('should allow if user has permission', async () => {
    mockAuthService.hasPermission.mockResolvedValue(true);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).user.userId).toBe('user1');
    expect(JSON.parse(response.body).user.permissions).toContain('perm');
  });
});

describe('requireRole', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = fastify();
    await app.register(fastifyJwt, { secret: 'test' });
    app.decorateRequest('authenticatedUser', {
      userId: 'user1',
      roles: ['admin'],
      permissions: [],
    });
    app.addHook('preHandler', requireRole('admin'));
    app.get('/test', async req => ({ user: req.authenticatedUser }));
    jest.clearAllMocks();
    jest.spyOn(container, 'resolve').mockReturnValue(mockAuthService);
  });

  it('should return 403 if user lacks role', async () => {
    mockAuthService.hasRole.mockResolvedValue(false);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(403);
  });

  it('should allow if user has role', async () => {
    mockAuthService.hasRole.mockResolvedValue(true);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).user.userId).toBe('user1');
    expect(JSON.parse(response.body).user.roles).toContain('admin');
  });
});
