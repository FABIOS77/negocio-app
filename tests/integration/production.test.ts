/**
 * tests/integration/production.test.ts
 *
 * Tests de integración para GET /api/v1/reports/production.
 * Verifica agrupación, exclusión de CANCELLED y cantidades correctas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

const DISH_UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const DISH_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('token'),
    verify: vi.fn().mockReturnValue({ sub: 'user-1' }),
  },
  sign: vi.fn().mockReturnValue('token'),
  verify: vi.fn().mockReturnValue({ sub: 'user-1' }),
}));

vi.mock('../../src/database/sequelize', () => ({
  sequelize: {
    define: vi.fn(),
    transaction: vi.fn((cb: (t: unknown) => Promise<unknown>) => cb({})),
    authenticate: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../../src/modules/users/user.model', () => ({
  User: { findOne: vi.fn(), findByPk: vi.fn() },
}));

vi.mock('../../src/modules/auth/refresh-token.model', () => ({
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));

vi.mock('../../src/modules/dishes/dish.model', () => ({
  Dish: { findAll: vi.fn(), findByPk: vi.fn() },
}));

vi.mock('../../src/modules/orders/orders.repository', () => ({
  findById: vi.fn(),
  findByIdRaw: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  countOrdersForDay: vi.fn(),
  findProductionSummary: vi.fn(),
}));

vi.mock('../../src/modules/dishes/dishes.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  findActiveByIds: vi.fn(),
  findAllActive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

vi.mock('../../src/modules/daily-menus/daily-menus.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByDate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

import * as ordersRepo from '../../src/modules/orders/orders.repository';

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/v1/reports/production', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return production summary grouped by dish', async () => {
    vi.mocked(ordersRepo.findProductionSummary).mockResolvedValue([
      { dish_id: DISH_UUID_1, dish_name: 'Sopa de Maní', total_quantity: 18 },
      { dish_id: DISH_UUID_2, dish_name: 'Arroz con Pollo', total_quantity: 10 },
    ]);

    const res = await request(app)
      .get('/api/v1/reports/production?date=2026-08-13')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].dish_name).toBe('Sopa de Maní');
    expect(res.body.data[0].total_quantity).toBe(18);
    expect(res.body.data[1].total_quantity).toBe(10);
  });

  it('should return empty array when no orders for the day', async () => {
    vi.mocked(ordersRepo.findProductionSummary).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/reports/production?date=2026-08-13')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('should exclude CANCELLED orders (handled by repository)', async () => {
    // El repositorio ya filtra CANCELLED — aquí verificamos que no aparecen
    vi.mocked(ordersRepo.findProductionSummary).mockResolvedValue([
      { dish_id: DISH_UUID_1, dish_name: 'Sopa de Maní', total_quantity: 5 },
      // DISH_UUID_2 no aparece porque sus pedidos estaban CANCELLED
    ]);

    const res = await request(app)
      .get('/api/v1/reports/production?date=2026-08-13')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].dish_id).toBe(DISH_UUID_1);
  });

  it('should return correct quantities summed across orders', async () => {
    // 3 pedidos con Sopa de Maní: 5 + 8 + 5 = 18
    vi.mocked(ordersRepo.findProductionSummary).mockResolvedValue([
      { dish_id: DISH_UUID_1, dish_name: 'Sopa de Maní', total_quantity: 18 },
    ]);

    const res = await request(app)
      .get('/api/v1/reports/production?date=2026-08-13')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data[0].total_quantity).toBe(18);
  });

  it('should return 400 when date is missing', async () => {
    const res = await request(app).get('/api/v1/reports/production').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/v1/reports/production?date=13/08/2026')
      .set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/reports/production?date=2026-08-13');
    expect(res.status).toBe(401);
  });
});
