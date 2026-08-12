/**
 * tests/unit/auth/auth.service.test.ts
 *
 * Tests unitarios para auth.service.
 * Mockea los modelos Sequelize para no requerir BD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticationError, AuthorizationError, ValidationError } from '../../../src/utils/errors';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock de argon2
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

// Mock de jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-access-token'),
    verify: vi.fn(),
  },
  sign: vi.fn().mockReturnValue('mock-access-token'),
  verify: vi.fn(),
}));

// Mock de los modelos
const mockUser = {
  id: 'user-uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  update: vi.fn(),
  get: vi.fn(),
};

const mockRefreshToken = {
  id: 'rt-uuid-1',
  userId: 'user-uuid-1',
  tokenHash: 'hash123',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  update: vi.fn(),
  get: vi.fn().mockReturnValue(mockUser),
};

vi.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('../../../src/modules/auth/refresh-token.model', () => ({
  RefreshToken: {
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-secret-long-enough-32-chars-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-long-enough-32-chars',
    ACCESS_TOKEN_EXPIRES: '15m',
    REFRESH_TOKEN_EXPIRES: '30d',
    NODE_ENV: 'test',
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import * as authService from '../../../src/modules/auth/auth.service';
import { User } from '../../../src/modules/users/user.model';
import { RefreshToken } from '../../../src/modules/auth/refresh-token.model';
import argon2 from 'argon2';

describe('authService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tokens and user on valid credentials', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);
    vi.mocked(RefreshToken.create).mockResolvedValue(mockRefreshToken as never);

    const result = await authService.login({ email: 'test@example.com', password: 'password123' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.id).toBe('user-uuid-1');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('should throw AuthenticationError for non-existent email', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(argon2.hash).mockResolvedValue('dummy' as never);

    await expect(
      authService.login({ email: 'notfound@example.com', password: 'pass' }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('should throw AuthenticationError for incorrect password', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(false as never);

    await expect(
      authService.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('should throw AuthorizationError for inactive user', async () => {
    vi.mocked(User.findOne).mockResolvedValue({ ...mockUser, active: false } as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);

    await expect(
      authService.login({ email: 'test@example.com', password: 'password123' }),
    ).rejects.toThrow(AuthorizationError);
  });

  it('should not expose passwordHash in response', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);
    vi.mocked(RefreshToken.create).mockResolvedValue(mockRefreshToken as never);

    const result = await authService.login({ email: 'test@example.com', password: 'pass' });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('password_hash');
  });
});

describe('authService.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return new accessToken for valid refresh token', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockRefreshToken as never);

    const result = await authService.refresh({ refreshToken: 'valid-token' });
    expect(result.accessToken).toBeDefined();
  });

  it('should throw AuthenticationError for invalid refresh token', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(null);

    await expect(authService.refresh({ refreshToken: 'bad-token' })).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('should throw AuthorizationError for inactive user', async () => {
    const inactiveUser = { ...mockUser, active: false };
    const tokenWithInactiveUser = {
      ...mockRefreshToken,
      get: vi.fn().mockReturnValue(inactiveUser),
    };
    vi.mocked(RefreshToken.findOne).mockResolvedValue(tokenWithInactiveUser as never);

    await expect(authService.refresh({ refreshToken: 'token' })).rejects.toThrow(
      AuthorizationError,
    );
  });
});

describe('authService.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should revoke the refresh token', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockRefreshToken as never);
    mockRefreshToken.update.mockResolvedValue(undefined);

    await authService.logout({ refreshToken: 'valid-token' });
    expect(mockRefreshToken.update).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
  });

  it('should be idempotent when token not found', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(null);

    // No debe lanzar error
    await expect(authService.logout({ refreshToken: 'missing' })).resolves.not.toThrow();
  });
});

describe('authService.changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw ValidationError for incorrect current password', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(false as never);

    await expect(
      authService.changePassword('user-uuid-1', 'wrong-current', 'new-pass'),
    ).rejects.toThrow(ValidationError);
  });

  it('should update password hash and revoke tokens on success', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(true as never);
    vi.mocked(argon2.hash).mockResolvedValue('new-hash' as never);
    mockUser.update.mockResolvedValue(undefined);
    vi.mocked(RefreshToken.update).mockResolvedValue([1] as never);

    await authService.changePassword('user-uuid-1', 'current-pass', 'new-pass');

    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'new-hash' }),
    );
    expect(RefreshToken.update).toHaveBeenCalled();
  });
});
