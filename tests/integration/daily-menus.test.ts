/**
 * tests/integration/daily-menus.test.ts
 *
 * Tests de integración para /api/v1/daily-menus.
 * Mockea repositorios (no modelos) y JWT para no requerir BD real.
 *
 * NOTA: Zod v4 usa validación UUID RFC 4122 estricta.
 * Usar UUIDs válidos como '550e8400-e29b-41d4-a716-446655440001'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

// UUIDs RFC 4122 válidos
const DISH_ID = '550e8400-e29b-41d4-a716-446655440001';
const MENU_ID = '550e8400-e29b-41d4-a716-446655440010';

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
  Dish: { findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menus.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByDate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
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

vi.mock('../../src/utils/timezone', () => ({
  getTodayInLaPaz: vi.fn().mockReturnValue('2026-08-12'),
}));

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    bulkCreate: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock('../../src/modules/expenses/expense-category.model', () => ({
  ExpenseCategory: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    init: vi.fn(),
  },
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

import * as menuRepo from '../../src/modules/daily-menus/daily-menus.repository';
import * as dishesRepo from '../../src/modules/dishes/dishes.repository';

const mockDish = {
  id: DISH_ID,
  name: 'Arroz con Pollo',
  price: '45.00',
  active: true,
  description: null,
  imageUrl: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMenu = {
  id: MENU_ID,
  menuDate: '2026-08-12',
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  get: vi.fn().mockReturnValue([mockDish]),
  update: vi.fn(),
};

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

describe('GET /api/v1/daily-menus/today', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return today menu', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(mockMenu as never);

    const res = await request(app).get('/api/v1/daily-menus/today').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.menuDate).toBe('2026-08-12');
  });

  it('should return null when no menu for today', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/daily-menus/today').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe('POST /api/v1/daily-menus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a daily menu with valid dishes', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);
    vi.mocked(dishesRepo.findActiveByIds).mockResolvedValue([mockDish] as never);
    vi.mocked(menuRepo.create).mockResolvedValue(mockMenu as never);
    vi.mocked(menuRepo.findById).mockResolvedValue(mockMenu as never);

    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '2026-08-13', dishIds: [DISH_ID] });

    expect(res.status).toBe(201);
    expect(res.body.data.dishes).toHaveLength(1);
  });

  it('should return 409 when menu for date already exists', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(mockMenu as never);

    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '2026-08-12', dishIds: [DISH_ID] });

    expect(res.status).toBe(409);
  });

  it('should return 400 for empty dishIds', async () => {
    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '2026-08-15', dishIds: [] });
    expect(res.status).toBe(400);
  });

  it('should return 400 for duplicate dishIds', async () => {
    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '2026-08-16', dishIds: [DISH_ID, DISH_ID] });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '12/08/2026', dishIds: [DISH_ID] });
    expect(res.status).toBe(400);
  });

  it('should return 422 when dish is inactive/non-existent', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);
    vi.mocked(dishesRepo.findActiveByIds).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/daily-menus')
      .set(AUTH_HEADER)
      .send({ menuDate: '2026-08-17', dishIds: [DISH_ID] });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/daily-menus/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 404 for non-existent menu', async () => {
    vi.mocked(menuRepo.findById).mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/daily-menus/${MENU_ID}`).set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  it('should return menu by id', async () => {
    vi.mocked(menuRepo.findById).mockResolvedValue(mockMenu as never);

    const res = await request(app).get(`/api/v1/daily-menus/${MENU_ID}`).set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(MENU_ID);
  });
});

describe('POST /api/v1/daily-menus/draw', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return selected dishes without duplicates', async () => {
    const dish2 = {
      ...mockDish,
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Sopa de Mani',
    };
    vi.mocked(dishesRepo.findAllActive).mockResolvedValue([mockDish, dish2] as never);

    const res = await request(app)
      .post('/api/v1/daily-menus/draw')
      .set(AUTH_HEADER)
      .send({ count: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.dishes).toHaveLength(2);
    const ids = res.body.data.dishes.map((d: { id: string }) => d.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('should return 400 for count = 0', async () => {
    const res = await request(app)
      .post('/api/v1/daily-menus/draw')
      .set(AUTH_HEADER)
      .send({ count: 0 });
    expect(res.status).toBe(400);
  });

  it('should return 422 when not enough active dishes', async () => {
    vi.mocked(dishesRepo.findAllActive).mockResolvedValue([mockDish] as never);

    const res = await request(app)
      .post('/api/v1/daily-menus/draw')
      .set(AUTH_HEADER)
      .send({ count: 5 });

    expect(res.status).toBe(422);
  });
});
