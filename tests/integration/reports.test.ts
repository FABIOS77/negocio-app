/**
 * tests/integration/reports.test.ts
 *
 * Tests de integración para los 5 endpoints de reportes financieros y operativos:
 * - GET /api/v1/reports/sales
 * - GET /api/v1/reports/expenses
 * - GET /api/v1/reports/result
 * - GET /api/v1/reports/top-dishes
 * - GET /api/v1/reports/production
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const DISH_UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const DISH_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const CATEGORY_UUID_1 = '550e8400-e29b-41d4-a716-446655440400';

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
  ExpenseCategory: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
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

vi.mock('../../src/modules/reports/reports.repository', () => ({
  aggregateSales: vi.fn(),
  aggregateExpenses: vi.fn(),
  findTopDishes: vi.fn(),
}));

import { app } from '../../src/app';
import * as reportsRepo from '../../src/modules/reports/reports.repository';
import * as ordersRepo from '../../src/modules/orders/orders.repository';

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

// ─── GET /api/v1/reports/sales ────────────────────────────────────────────────

describe('GET /api/v1/reports/sales', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return sales report for given period', async () => {
    vi.mocked(reportsRepo.aggregateSales).mockResolvedValue({
      totalSales: 1500.50,
      orderCount: 12,
      byPaymentMethod: { CASH: 1000.50, QR: 500.00, OTHER: 0 },
    });

    const res = await request(app)
      .get('/api/v1/reports/sales?period=month&date_from=2026-08-01')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_sales).toBe(1500.50);
    expect(res.body.data.order_count).toBe(12);
    expect(res.body.data.by_payment_method.CASH).toBe(1000.50);
    expect(res.body.data.period.period_type).toBe('month');
  });

  it('should return 401 without authorization token', async () => {
    const res = await request(app).get('/api/v1/reports/sales');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/reports/expenses ─────────────────────────────────────────────

describe('GET /api/v1/reports/expenses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return expense report', async () => {
    vi.mocked(reportsRepo.aggregateExpenses).mockResolvedValue({
      totalExpenses: 450.00,
      expenseCount: 3,
      byCategory: [
        { category_id: CATEGORY_UUID_1, category_name: 'Insumos', total_amount: 450.00 },
      ],
      byPaymentMethod: { CASH: 450.00, QR: 0, OTHER: 0 },
    });

    const res = await request(app)
      .get('/api/v1/reports/expenses?date_from=2026-08-01&date_to=2026-08-12')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.total_expenses).toBe(450.00);
    expect(res.body.data.by_category).toHaveLength(1);
    expect(res.body.data.period.period_type).toBe('custom');
  });
});

// ─── GET /api/v1/reports/result ───────────────────────────────────────────────

describe('GET /api/v1/reports/result', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return financial result (total_sales - total_expenses)', async () => {
    vi.mocked(reportsRepo.aggregateSales).mockResolvedValue({
      totalSales: 2000.00,
      orderCount: 15,
      byPaymentMethod: { CASH: 1500.00, QR: 500.00, OTHER: 0 },
    });

    vi.mocked(reportsRepo.aggregateExpenses).mockResolvedValue({
      totalExpenses: 650.50,
      expenseCount: 4,
      byCategory: [],
      byPaymentMethod: { CASH: 650.50, QR: 0, OTHER: 0 },
    });

    const res = await request(app)
      .get('/api/v1/reports/result?period=day&date_from=2026-08-12')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.total_sales).toBe(2000.00);
    expect(res.body.data.total_expenses).toBe(650.50);
    expect(res.body.data.result).toBe(1349.50); // 2000.00 - 650.50
  });
});

// ─── GET /api/v1/reports/top-dishes ──────────────────────────────────────────

describe('GET /api/v1/reports/top-dishes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return top dishes ordered by quantity', async () => {
    vi.mocked(reportsRepo.findTopDishes).mockResolvedValue([
      { dish_id: DISH_UUID_1, dish_name: 'Sopa de Maní', total_quantity: 30, total_revenue: 600.00 },
      { dish_id: DISH_UUID_2, dish_name: 'Arroz con Pollo', total_quantity: 20, total_revenue: 500.00 },
    ]);

    const res = await request(app)
      .get('/api/v1/reports/top-dishes?limit=5')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].dish_name).toBe('Sopa de Maní');
    expect(res.body.data[0].total_quantity).toBe(30);
    expect(res.body.data[0].total_revenue).toBe(600.00);
  });
});

// ─── GET /api/v1/reports/production ──────────────────────────────────────────

describe('GET /api/v1/reports/production', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return production summary for date', async () => {
    vi.mocked(ordersRepo.findProductionSummary).mockResolvedValue([
      { dish_id: DISH_UUID_1, dish_name: 'Sopa de Maní', total_quantity: 15 },
    ]);

    const res = await request(app)
      .get('/api/v1/reports/production?date=2026-08-12')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].total_quantity).toBe(15);
  });
});
