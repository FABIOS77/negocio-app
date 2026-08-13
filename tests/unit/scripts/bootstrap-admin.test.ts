/**
 * tests/unit/scripts/bootstrap-admin.test.ts
 *
 * Tests unitarios para la herramienta de bootstrap de usuario administrador.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import argon2 from 'argon2';

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$mockedhash'),
    argon2id: 2,
  },
  hash: vi.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$mockedhash'),
  argon2id: 2,
}));

vi.mock('../../../src/database/sequelize', () => ({
  sequelize: {
    define: vi.fn(),
    transaction: vi.fn((cb: (t: unknown) => Promise<unknown>) => cb({})),
    authenticate: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { createProductionAdmin } from '../../../scripts/bootstrap-admin';
import { User } from '../../../src/modules/users/user.model';

describe('Production Admin Bootstrap Tool (scripts/bootstrap-admin.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if confirm flag is missing or not true', async () => {
    await expect(
      createProductionAdmin({
        name: 'Admin Pro',
        email: 'admin@prod.com',
        password: 'AdminPassword123!',
        confirm: 'false',
      }),
    ).rejects.toThrow('Se requiere BOOTSTRAP_CONFIRM=true');
  });

  it('should throw error if name is empty', async () => {
    await expect(
      createProductionAdmin({
        name: '   ',
        email: 'admin@prod.com',
        password: 'AdminPassword123!',
        confirm: 'true',
      }),
    ).rejects.toThrow('BOOTSTRAP_ADMIN_NAME es requerido');
  });

  it('should throw error if email format is invalid', async () => {
    await expect(
      createProductionAdmin({
        name: 'Admin Pro',
        email: 'invalid-email',
        password: 'AdminPassword123!',
        confirm: 'true',
      }),
    ).rejects.toThrow('formato de correo válido');
  });

  it('should throw error if password does not meet complexity requirements', async () => {
    await expect(
      createProductionAdmin({
        name: 'Admin Pro',
        email: 'admin@prod.com',
        password: 'simple', // Sin mayúscula, número ni símbolo
        confirm: 'true',
      }),
    ).rejects.toThrow('mínimo 8 caracteres');
  });

  it('should throw error if user with email already exists', async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      id: 'existing-id',
      email: 'admin@prod.com',
    } as unknown as User);

    await expect(
      createProductionAdmin({
        name: 'Admin Pro',
        email: 'admin@prod.com',
        password: 'AdminPassword123!',
        confirm: 'true',
      }),
    ).rejects.toThrow('ya existe en la base de datos');
  });

  it('should create admin user successfully and return non-sensitive data', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue({
      id: 'prod-admin-uuid',
      name: 'Admin Produccion',
      email: 'admin@prod.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockedhash',
      active: true,
      version: 1,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    } as unknown as User);

    const result = await createProductionAdmin({
      name: 'Admin Produccion',
      email: 'admin@prod.com',
      password: 'AdminPassword123!',
      confirm: 'true',
    });

    expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'admin@prod.com' } });
    expect(argon2.hash).toHaveBeenCalledWith('AdminPassword123!', expect.any(Object));
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Admin Produccion',
        email: 'admin@prod.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockedhash',
        active: true,
        version: 1,
      }),
      expect.any(Object),
    );

    expect(result).toEqual({
      id: 'prod-admin-uuid',
      name: 'Admin Produccion',
      email: 'admin@prod.com',
      active: true,
      version: 1,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    });

    // Ensure raw password is not exposed in returned result
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });
});
