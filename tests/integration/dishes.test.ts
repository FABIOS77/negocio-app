/**
 * tests/integration/dishes.test.ts
 *
 * Tests de integración para /api/v1/dishes.
 * Mockea el repository de dishes y JWT para no requerir BD real.
 *
 * NOTA: Zod v4 usa validación UUID RFC 4122 estricta (versión 1-8, variant 89ab).
 * Usar UUIDs válidos como '550e8400-e29b-41d4-a716-446655440001'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

// UUIDs RFC 4122 válidos para usar en tests
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

import * as dishesRepo from '../../src/modules/dishes/dishes.repository';

const mockDish = {
  id: DISH_UUID_1,
  name: 'Arroz con Pollo',
  description: 'Tradicional',
  price: '45.00',
  imageUrl: null,
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

describe('GET /api/v1/dishes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return paginated dish list', async () => {
    vi.mocked(dishesRepo.findAll).mockResolvedValue({ count: 1, rows: [mockDish] } as never);

    const res = await request(app).get('/api/v1/dishes').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.data[0].price).toBe(45.0);
  });

  it('should filter by active=true', async () => {
    vi.mocked(dishesRepo.findAll).mockResolvedValue({ count: 1, rows: [mockDish] } as never);

    const res = await request(app).get('/api/v1/dishes?active=true').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  it('should filter by active=false', async () => {
    vi.mocked(dishesRepo.findAll).mockResolvedValue({ count: 0, rows: [] } as never);

    const res = await request(app).get('/api/v1/dishes?active=false').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/dishes');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/dishes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a dish and return 201', async () => {
    vi.mocked(dishesRepo.create).mockResolvedValue(mockDish as never);

    const res = await request(app).post('/api/v1/dishes').set(AUTH_HEADER).send({
      name: 'Arroz con Pollo',
      price: 45.0,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Arroz con Pollo');
    expect(res.body.data.price).toBe(45.0);
  });

  it('should return 400 for missing name', async () => {
    const res = await request(app).post('/api/v1/dishes').set(AUTH_HEADER).send({ price: 45.0 });
    expect(res.status).toBe(400);
  });

  it('should return 400 for price = 0', async () => {
    const res = await request(app)
      .post('/api/v1/dishes')
      .set(AUTH_HEADER)
      .send({ name: 'Test', price: 0 });
    expect(res.status).toBe(400);
  });

  it('should return 400 for negative price', async () => {
    const res = await request(app)
      .post('/api/v1/dishes')
      .set(AUTH_HEADER)
      .send({ name: 'Test', price: -10 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/dishes/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return dish by valid UUID', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(mockDish as never);

    const res = await request(app).get(`/api/v1/dishes/${DISH_UUID_1}`).set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(DISH_UUID_1);
  });

  it('should return 400 for invalid UUID format', async () => {
    const res = await request(app).get('/api/v1/dishes/not-a-uuid').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent UUID', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/dishes/${DISH_UUID_2}`).set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/dishes/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update a dish and return 200', async () => {
    const updated = { ...mockDish, name: 'Pollo a la Brasa', version: 2 };
    vi.mocked(dishesRepo.findById)
      .mockResolvedValueOnce(mockDish as never)
      .mockResolvedValueOnce(updated as never);
    vi.mocked(dishesRepo.update).mockResolvedValue(updated as never);

    const res = await request(app)
      .put(`/api/v1/dishes/${DISH_UUID_1}`)
      .set(AUTH_HEADER)
      .send({ name: 'Pollo a la Brasa' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Pollo a la Brasa');
  });
});

describe('DELETE /api/v1/dishes/:id (soft delete)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should soft delete and return 204', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(mockDish as never);
    vi.mocked(dishesRepo.softDelete).mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/v1/dishes/${DISH_UUID_1}`).set(AUTH_HEADER);
    expect(res.status).toBe(204);
  });

  it('should return 404 for non-existent dish', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(null);

    const res = await request(app).delete(`/api/v1/dishes/${DISH_UUID_2}`).set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });
});
