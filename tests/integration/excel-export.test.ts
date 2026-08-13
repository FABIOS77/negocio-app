/**
 * tests/integration/excel-export.test.ts
 *
 * Tests de integración para la exportación de reportes Excel (GET /api/v1/reports/export).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked-token'),
    verify: vi.fn().mockReturnValue({ sub: '550e8400-e29b-41d4-a716-446655440200' }),
  },
  sign: vi.fn().mockReturnValue('mocked-token'),
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
  DailyMenu: { findOne: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({
  DailyMenuDish: { init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: { findAll: vi.fn(), findOne: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: { findAll: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: { findAll: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense-category.model', () => ({
  ExpenseCategory: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/sync-operation.model', () => ({
  SyncOperation: { findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/change-log.model', () => ({
  ChangeLog: { findAll: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

import { app } from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { Order } from '../../src/modules/orders/order.model';
import { Expense } from '../../src/modules/expenses/expense.model';
import { OrderItem } from '../../src/modules/orders/order-item.model';

describe('GET /api/v1/reports/export — Excel Report Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findByPk).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440200',
      active: true,
    } as unknown as User);
  });

  it('should return 401 Unauthorized if no Bearer token is provided', async () => {
    const res = await request(app).get('/api/v1/reports/export?date_from=2026-08-01&date_to=2026-08-31');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should return 400 Validation Error if date_from is missing', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export?date_to=2026-08-31')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 Validation Error if date_from > date_to', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export?date_from=2026-08-31&date_to=2026-08-01')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 OK and generate valid XLSX with 4 sheets', async () => {
    // Mock Sales orders
    vi.mocked(Order.findAll).mockResolvedValue([
      {
        id: 'ord-1',
        orderNumber: '20260801-0001',
        customerName: 'Cliente Test',
        locationText: 'Oficina A',
        total: '50.00',
        paymentMethod: 'CASH',
        status: 'DELIVERED',
        orderedAt: new Date('2026-08-01T12:00:00.000Z'),
        items: [
          { dishNameSnapshot: 'Sopa de Maní', quantity: 2, unitPrice: '25.00', subtotal: '50.00' },
        ],
      },
    ] as unknown as Order[]);

    // Mock Expenses
    vi.mocked(Expense.findAll).mockResolvedValue([
      {
        id: 'exp-1',
        description: 'Insumo verduras',
        amount: '20.00',
        paymentMethod: 'CASH',
        expenseDate: '2026-08-01',
        category: { name: 'Insumos' },
      },
    ] as unknown as Expense[]);

    // Mock OrderItem for Top Dishes / Platos
    vi.mocked(OrderItem.findAll).mockResolvedValue([
      {
        dishId: 'dish-1',
        dishNameSnapshot: 'Sopa de Maní',
        quantity: 2,
        subtotal: '50.00',
      },
    ] as unknown as OrderItem[]);

    const res = await request(app)
      .get('/api/v1/reports/export?date_from=2026-08-01&date_to=2026-08-31')
      .set('Authorization', 'Bearer valid-token')
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('filename="reporte_2026-08-01_2026-08-31.xlsx"');

    // Parse returned Buffer using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body as unknown as ArrayBuffer);

    // Verify 4 sheets exist
    expect(workbook.worksheets.length).toBe(4);
    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    expect(sheetNames).toEqual(['Resumen', 'Pedidos', 'Gastos', 'Platos']);

    // Assert Resumen sheet
    const resumenSheet = workbook.getWorksheet('Resumen');
    expect(resumenSheet).toBeDefined();
    expect(resumenSheet?.getCell('A1').value).toBe('Concepto');
    expect(resumenSheet?.getCell('B1').value).toBe('Valor');
    expect(resumenSheet?.getCell('B2').value).toBe('2026-08-01 a 2026-08-31');

    // Assert Pedidos sheet
    const pedidosSheet = workbook.getWorksheet('Pedidos');
    expect(pedidosSheet).toBeDefined();
    expect(pedidosSheet?.getCell('A1').value).toBe('Fecha');
    expect(pedidosSheet?.getCell('E2').value).toBe('Sopa de Maní x2');

    // Assert Gastos sheet
    const gastosSheet = workbook.getWorksheet('Gastos');
    expect(gastosSheet).toBeDefined();
    expect(gastosSheet?.getCell('B2').value).toBe('Insumo verduras');

    // Assert Platos sheet
    const platosSheet = workbook.getWorksheet('Platos');
    expect(platosSheet).toBeDefined();
    expect(platosSheet?.getCell('A2').value).toBe('Sopa de Maní');
  });
});
