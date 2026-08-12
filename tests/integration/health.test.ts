/**
 * tests/integration/health.test.ts
 *
 * Test de integración del health check endpoint.
 * Importa el app de Express directamente (sin iniciar el servidor HTTP ni la BD).
 * El health check no requiere conexión a base de datos.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock sequelize y modelos para evitar que Order.init() falle sin BD
vi.mock('../../src/database/sequelize', () => ({
  sequelize: {
    define: vi.fn(),
    transaction: vi.fn(),
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

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: { findAll: vi.fn(), findByPk: vi.fn(), findAndCountAll: vi.fn(), count: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: { findAll: vi.fn(), findByPk: vi.fn(), bulkCreate: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu.model', () => ({
  DailyMenu: { findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn(), findAndCountAll: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({
  DailyMenuDish: { findAll: vi.fn(), findByPk: vi.fn(), create: vi.fn(), bulkCreate: vi.fn(), destroy: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/auth/refresh-token.model', () => ({
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn(), init: vi.fn() },
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

import { app } from '../../src/app';

describe('GET /health', () => {
  it('should return 200 with success status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Unknown routes', () => {
  it('should return 404 for unknown GET routes', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 for unknown POST routes', async () => {
    const response = await request(app).post('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
