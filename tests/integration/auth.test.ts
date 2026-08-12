/**
 * tests/integration/auth.test.ts
 *
 * Tests de integración para /api/v1/auth/*.
 * Usa supertest contra el app de Express.
 * Mockea los modelos Sequelize para no requerir BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(),
    hash: vi.fn(),
    argon2id: 1,
  },
  verify: vi.fn(),
  hash: vi.fn(),
  argon2id: 1,
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock.access.token'),
    verify: vi.fn(),
  },
  sign: vi.fn().mockReturnValue('mock.access.token'),
  verify: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  passwordHash: 'hashed',
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  update: vi.fn(),
  get: vi.fn(),
};

const mockToken = {
  id: 'rt-1',
  userId: 'user-1',
  tokenHash: '',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400000 * 30),
  update: vi.fn(),
  get: vi.fn().mockReturnValue(mockUser),
};

vi.mock('../../src/modules/users/user.model', () => ({
  User: { findOne: vi.fn(), findByPk: vi.fn() },
}));

vi.mock('../../src/modules/auth/refresh-token.model', () => ({
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: { findAll: vi.fn(), findByPk: vi.fn(), findAndCountAll: vi.fn(), count: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: { findAll: vi.fn(), findByPk: vi.fn(), bulkCreate: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense-category.model', () => ({
  ExpenseCategory: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/sync-operation.model', () => ({
  SyncOperation: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/change-log.model', () => ({
  ChangeLog: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

import { User } from '../../src/modules/users/user.model';
import { RefreshToken } from '../../src/modules/auth/refresh-token.model';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 200 with tokens on valid credentials', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);
    vi.mocked(RefreshToken.create).mockResolvedValue(mockToken as never);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 400 for missing email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'pass' });
    expect(res.status).toBe(400);
  });

  it('should return 401 for wrong password', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(false as never);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 for inactive user', async () => {
    vi.mocked(User.findOne).mockResolvedValue({ ...mockUser, active: false } as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'pass' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 200 with new accessToken for valid refresh token', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockToken as never);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-token-128-hex' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should return 401 for invalid/revoked refresh token', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'bad-token' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 204 on successful logout', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockToken as never);
    mockToken.update.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'valid-token' });

    expect(res.status).toBe(204);
  });

  it('should return 204 even if token not found (idempotent)', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'non-existent' });

    expect(res.status).toBe(204);
  });
});

describe('requireAuth middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('should return 401 when token is invalid', async () => {
    const error = new Error('invalid token');
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw error;
    });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer bad.token.here');

    expect(res.status).toBe(401);
  });

  it('should allow access with valid JWT', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'user-1' } as never);
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer valid.token');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('user-1');
  });
});
