/**
 * tests/integration/expenses.test.ts
 *
 * Tests de integración para /api/v1/expenses y /api/v1/expenses/categories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// UUIDs válidos RFC 4122
const CATEGORY_UUID_1 = '550e8400-e29b-41d4-a716-446655440400';
const EXPENSE_UUID_1 = '550e8400-e29b-41d4-a716-446655440500';
const USER_UUID = '550e8400-e29b-41d4-a716-446655440200';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('token'),
    verify: vi.fn().mockReturnValue({ sub: '550e8400-e29b-41d4-a716-446655440200' }),
  },
  sign: vi.fn().mockReturnValue('token'),
  verify: vi.fn().mockReturnValue({ sub: '550e8400-e29b-41d4-a716-446655440200' }),
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
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/dishes/dish.model', () => ({
  Dish: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu.model', () => ({
  DailyMenu: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({
  DailyMenuDish: { findAll: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense-category.model', () => ({
  ExpenseCategory: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock('../../src/modules/expenses/expense-categories.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  countAssociatedExpenses: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../src/modules/expenses/expenses.repository', () => ({
  findById: vi.fn(),
  findByIdRaw: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

import { app } from '../../src/app';
import * as catRepo from '../../src/modules/expenses/expense-categories.repository';
import * as expRepo from '../../src/modules/expenses/expenses.repository';
import { User } from '../../src/modules/users/user.model';
import { ExpenseCategory } from '../../src/modules/expenses/expense-category.model';

const mockUser = {
  id: USER_UUID,
  name: 'Test User',
  email: 'test@example.com',
  active: true,
};

const mockCategory = {
  id: CATEGORY_UUID_1,
  name: 'Insumos / Verduras',
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  update: vi.fn(),
};

const mockExpense = {
  id: EXPENSE_UUID_1,
  description: 'Compra de verduras en el mercado',
  amount: '150.50',
  categoryId: CATEGORY_UUID_1,
  paymentMethod: 'CASH',
  expenseDate: '2026-08-12',
  createdBy: USER_UUID,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: CATEGORY_UUID_1, name: 'Insumos / Verduras', active: true },
  creator: { id: USER_UUID, name: 'Test User', email: 'test@example.com' },
  update: vi.fn(),
  destroy: vi.fn(),
};

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

// ─── Categorías de Gastos ─────────────────────────────────────────────────────

describe('/api/v1/expenses/categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /categories should return category list', async () => {
    vi.mocked(catRepo.findAll).mockResolvedValue([mockCategory] as never);

    const res = await request(app).get('/api/v1/expenses/categories').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Insumos / Verduras');
  });

  it('POST /categories should create category', async () => {
    vi.mocked(catRepo.findByName).mockResolvedValue(null);
    vi.mocked(catRepo.create).mockResolvedValue(mockCategory as never);

    const res = await request(app)
      .post('/api/v1/expenses/categories')
      .set(AUTH_HEADER)
      .send({ name: 'Insumos / Verduras' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Insumos / Verduras');
  });

  it('POST /categories should return 409 for duplicate name', async () => {
    vi.mocked(catRepo.findByName).mockResolvedValue(mockCategory as never);

    const res = await request(app)
      .post('/api/v1/expenses/categories')
      .set(AUTH_HEADER)
      .send({ name: 'Insumos / Verduras' });

    expect(res.status).toBe(409);
  });

  it('PATCH /categories/:id should update category', async () => {
    vi.mocked(catRepo.findById).mockResolvedValue(mockCategory as never);
    vi.mocked(catRepo.findByName).mockResolvedValue(null);
    vi.mocked(catRepo.update).mockResolvedValue({ ...mockCategory, name: 'Limpieza' } as never);

    const res = await request(app)
      .patch(`/api/v1/expenses/categories/${CATEGORY_UUID_1}`)
      .set(AUTH_HEADER)
      .send({ name: 'Limpieza' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Limpieza');
  });

  it('DELETE /categories/:id should deactivate when category has historical expenses', async () => {
    vi.mocked(catRepo.findById).mockResolvedValue(mockCategory as never);
    vi.mocked(catRepo.countAssociatedExpenses).mockResolvedValue(5); // Tiene 5 gastos históricos

    const res = await request(app)
      .delete(`/api/v1/expenses/categories/${CATEGORY_UUID_1}`)
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.deactivated).toBe(true);
    expect(catRepo.update).toHaveBeenCalledWith(mockCategory, { active: false });
    expect(catRepo.remove).not.toHaveBeenCalled();
  });

  it('DELETE /categories/:id should destroy physically when no historical expenses exist', async () => {
    vi.mocked(catRepo.findById).mockResolvedValue(mockCategory as never);
    vi.mocked(catRepo.countAssociatedExpenses).mockResolvedValue(0); // 0 gastos

    const res = await request(app)
      .delete(`/api/v1/expenses/categories/${CATEGORY_UUID_1}`)
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.deactivated).toBe(false);
    expect(catRepo.remove).toHaveBeenCalledWith(mockCategory);
  });
});

// ─── Gastos ───────────────────────────────────────────────────────────────────

describe('/api/v1/expenses — Expenses CRUD & Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(ExpenseCategory.findByPk).mockResolvedValue(mockCategory as never);
  });

  it('POST /expenses should create expense and return 201', async () => {
    vi.mocked(expRepo.findById)
      .mockResolvedValueOnce(null) // Check idempotencia inicial
      .mockResolvedValueOnce(mockExpense as never); // Reload DTO
    vi.mocked(expRepo.create).mockResolvedValue({ id: EXPENSE_UUID_1 } as never);

    const res = await request(app)
      .post('/api/v1/expenses')
      .set(AUTH_HEADER)
      .send({
        description: 'Compra de verduras en el mercado',
        amount: 150.50,
        category_id: CATEGORY_UUID_1,
        payment_method: 'CASH',
        expense_date: '2026-08-12',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(150.5);
    expect(res.body.data.paymentMethod).toBe('CASH');
  });

  it('POST /expenses retry with same UUID should return existing expense with HTTP 200 (Idempotency)', async () => {
    vi.mocked(expRepo.findById).mockResolvedValue(mockExpense as never);

    const res = await request(app)
      .post('/api/v1/expenses')
      .set(AUTH_HEADER)
      .send({
        id: EXPENSE_UUID_1,
        description: 'Compra de verduras en el mercado',
        amount: 150.50,
        category_id: CATEGORY_UUID_1,
        payment_method: 'CASH',
      });

    expect(res.status).toBe(200); // HTTP 200 para retry
    expect(res.body.data.id).toBe(EXPENSE_UUID_1);
    expect(expRepo.create).not.toHaveBeenCalled();
  });

  it('POST /expenses should return 400 for amount <= 0', async () => {
    const res = await request(app)
      .post('/api/v1/expenses')
      .set(AUTH_HEADER)
      .send({
        description: 'Carne',
        amount: 0,
        category_id: CATEGORY_UUID_1,
        payment_method: 'CASH',
      });

    expect(res.status).toBe(400);
  });

  it('POST /expenses should return 422 for inactive category', async () => {
    const inactiveCategory = { ...mockCategory, active: false };
    vi.mocked(ExpenseCategory.findByPk).mockResolvedValue(inactiveCategory as never);
    vi.mocked(expRepo.findById).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/expenses')
      .set(AUTH_HEADER)
      .send({
        description: 'Carne',
        amount: 100,
        category_id: CATEGORY_UUID_1,
        payment_method: 'CASH',
      });

    expect(res.status).toBe(422);
  });

  it('GET /expenses should return paginated expenses', async () => {
    vi.mocked(expRepo.findAll).mockResolvedValue({
      count: 1,
      rows: [mockExpense],
    } as never);

    const res = await request(app).get('/api/v1/expenses').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('PUT /expenses/:id should update expense details', async () => {
    vi.mocked(expRepo.findByIdRaw).mockResolvedValue(mockExpense as never);
    vi.mocked(expRepo.update).mockResolvedValue(mockExpense as never);
    vi.mocked(expRepo.findById).mockResolvedValue({
      ...mockExpense,
      amount: '200.00',
      description: 'Compra de carne premium',
    } as never);

    const res = await request(app)
      .put(`/api/v1/expenses/${EXPENSE_UUID_1}`)
      .set(AUTH_HEADER)
      .send({
        description: 'Compra de carne premium',
        amount: 200.00,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(200);
    expect(res.body.data.description).toBe('Compra de carne premium');
  });

  it('DELETE /expenses/:id should soft delete expense', async () => {
    vi.mocked(expRepo.findByIdRaw).mockResolvedValue(mockExpense as never);

    const res = await request(app)
      .delete(`/api/v1/expenses/${EXPENSE_UUID_1}`)
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(expRepo.softDelete).toHaveBeenCalledWith(mockExpense);
  });
});
