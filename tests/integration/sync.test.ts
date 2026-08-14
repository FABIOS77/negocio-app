/**
 * tests/integration/sync.test.ts
 *
 * Tests de integración para el motor de sincronización offline/online:
 * - POST /api/v1/sync/push
 * - GET  /api/v1/sync/pull
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// UUIDs RFC 4122 válidos
const OP_UUID_1 = '550e8400-e29b-41d4-a716-446655440600';
const OP_UUID_2 = '550e8400-e29b-41d4-a716-446655440601';
const ENTITY_UUID_1 = '550e8400-e29b-41d4-a716-446655440610';
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
  Dish: { findAll: vi.fn(), findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu.model', () => ({
  DailyMenu: { findAll: vi.fn(), findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({
  DailyMenuDish: { findAll: vi.fn(), bulkCreate: vi.fn(), destroy: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order.model', () => ({
  Order: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/orders/order-item.model', () => ({
  OrderItem: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense-category.model', () => ({
  ExpenseCategory: { findAll: vi.fn(), findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/expenses/expense.model', () => ({
  Expense: { findAll: vi.fn(), findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/sync-operation.model', () => ({
  SyncOperation: { findByPk: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/change-log.model', () => ({
  ChangeLog: { findAll: vi.fn(), create: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/sync.repository', () => ({
  findSyncOperation: vi.fn(),
  recordSyncOperation: vi.fn(),
  recordChangeLog: vi.fn(),
  getChanges: vi.fn(),
}));

vi.mock('../../src/modules/orders/orders.service', () => ({
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  changeStatus: vi.fn(),
}));

vi.mock('../../src/modules/expenses/expenses.service', () => ({
  createExpense: vi.fn(),
  getExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

import { app } from '../../src/app';
import * as syncRepo from '../../src/modules/sync/sync.repository';
import * as ordersService from '../../src/modules/orders/orders.service';
import * as expensesService from '../../src/modules/expenses/expenses.service';

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

const mockChangeLogEntry = {
  serverChangeId: '1004',
  entityType: 'order',
  entityId: ENTITY_UUID_1,
  operation: 'CREATE',
  snapshot: { id: ENTITY_UUID_1, status: 'PENDING' },
  version: 1,
  createdAt: new Date(),
};

// ─── POST /api/v1/sync/push ───────────────────────────────────────────────────

describe('POST /api/v1/sync/push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncRepo.findSyncOperation).mockResolvedValue(null);
    vi.mocked(syncRepo.recordChangeLog).mockResolvedValue(mockChangeLogEntry as never);
  });

  it('should process CREATE order operation', async () => {
    vi.mocked(ordersService.createOrder).mockResolvedValue({
      order: {
        id: ENTITY_UUID_1,
        orderNumber: '20260812-0001',
        customerName: 'Juan Pérez',
        locationText: null,
        total: 50,
        paymentMethod: 'CASH',
        status: 'PENDING',
        orderedAt: new Date(),
        createdBy: USER_UUID,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      },
      created: true,
    });

    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_1,
            entity_type: 'order',
            entity_id: ENTITY_UUID_1,
            operation: 'CREATE',
            payload: { customer_name: 'Juan Pérez', payment_method: 'CASH', items: [] },
            client_timestamp: '2026-08-12T12:00:00.000Z',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.processed).toBe(1);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    expect(res.body.data.results[0].server_version).toBe(1);
  });

  it('should return DUPLICATE for previously processed operation_id (Idempotency)', async () => {
    vi.mocked(syncRepo.findSyncOperation).mockResolvedValue({
      operationId: OP_UUID_1,
      entityType: 'order',
      entityId: ENTITY_UUID_1,
      operation: 'CREATE',
      payload: {},
      clientTimestamp: new Date(),
      baseVersion: null,
      status: 'PROCESSED',
      errorCode: null,
      errorMessage: null,
      serverVersion: 1,
      serverChangeId: '1004',
      resultData: { id: ENTITY_UUID_1 },
      processedBy: USER_UUID,
      processedAt: new Date(),
      createdAt: new Date(),
    } as never);

    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_1, // Mismo operation_id
            entity_type: 'order',
            entity_id: ENTITY_UUID_1,
            operation: 'CREATE',
            payload: {},
            client_timestamp: '2026-08-12T12:00:00.000Z',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0].status).toBe('DUPLICATE');
    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('should detect CONFLICT when UPDATE has outdated base_version', async () => {
    // Servidor tiene versión 2, cliente envía base_version 1
    vi.mocked(expensesService.getExpense).mockResolvedValue({
      id: ENTITY_UUID_1,
      description: 'Gasto Servidor',
      amount: 100,
      categoryId: 'cat-1',
      paymentMethod: 'CASH',
      expenseDate: '2026-08-12',
      createdBy: USER_UUID,
      version: 2, // versión actual en servidor
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_2,
            entity_type: 'expense',
            entity_id: ENTITY_UUID_1,
            operation: 'UPDATE',
            payload: { amount: 150 },
            client_timestamp: '2026-08-12T12:00:00.000Z',
            base_version: 1, // Desactualizada
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0].status).toBe('CONFLICT');
    expect(res.body.data.results[0].server_version).toBe(2);
    expect(expensesService.updateExpense).not.toHaveBeenCalled();
  });

  it('should reject offline creation of user entity (Security)', async () => {
    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_1,
            entity_type: 'user',
            entity_id: ENTITY_UUID_1,
            operation: 'CREATE',
            payload: { name: 'Hack User' },
            client_timestamp: '2026-08-12T12:00:00.000Z',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].status).toBe('FAILED');
    expect(res.body.data.results[0].error_code).toBe('USER_OFFLINE_CREATE_FORBIDDEN');
  });

  it('should process DELETE idempotently when entity does not exist on server', async () => {
    vi.mocked(expensesService.getExpense).mockRejectedValue(new Error('Expense not found'));

    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_1,
            entity_type: 'expense',
            entity_id: ENTITY_UUID_1,
            operation: 'DELETE',
            payload: {},
            client_timestamp: '2026-08-14T12:00:00.000Z',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.processed).toBe(1);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    expect(res.body.data.results[0].data.deleted).toBe(true);
  });

  it('should fallback UPDATE to CREATE (Upsert) when entity does not exist on server', async () => {
    vi.mocked(expensesService.getExpense).mockRejectedValue(new Error('Expense not found'));
    vi.mocked(expensesService.createExpense).mockResolvedValue({
      expense: {
        id: ENTITY_UUID_1,
        description: 'Gasto Upsert',
        amount: 80,
        categoryId: 'cat-1',
        paymentMethod: 'CASH',
        expenseDate: '2026-08-14',
        createdBy: USER_UUID,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      created: true,
    } as never);

    const res = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_UUID_1,
            entity_type: 'expense',
            entity_id: ENTITY_UUID_1,
            operation: 'UPDATE',
            payload: { description: 'Gasto Upsert', amount: 80, category_id: 'cat-1', payment_method: 'CASH' },
            client_timestamp: '2026-08-14T12:00:00.000Z',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.processed).toBe(1);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    expect(expensesService.createExpense).toHaveBeenCalled();
  });

  it('should return 401 without authorization token', async () => {
    const res = await request(app).post('/api/v1/sync/push').send({ operations: [] });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/sync/pull ────────────────────────────────────────────────────

describe('GET /api/v1/sync/pull', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return changes after cursor', async () => {
    vi.mocked(syncRepo.getChanges).mockResolvedValue({
      changes: [
        {
          serverChangeId: '1004',
          entityType: 'order',
          entityId: ENTITY_UUID_1,
          operation: 'CREATE',
          snapshot: { id: ENTITY_UUID_1, status: 'PENDING' },
          version: 1,
          createdAt: new Date(),
        },
      ] as never,
      nextCursor: 1004,
      hasMore: false,
    });

    const res = await request(app)
      .get('/api/v1/sync/pull?cursor=1000&limit=50')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.changes).toHaveLength(1);
    expect(res.body.data.next_cursor).toBe(1004);
    expect(res.body.data.has_more).toBe(false);
  });

  it('should filter changes by entity_types', async () => {
    vi.mocked(syncRepo.getChanges).mockResolvedValue({
      changes: [],
      nextCursor: 0,
      hasMore: false,
    });

    const res = await request(app)
      .get('/api/v1/sync/pull?cursor=0&entity_types=order,expense')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(syncRepo.getChanges).toHaveBeenCalledWith({
      cursor: 0,
      limit: 100,
      entityTypes: ['order', 'expense'],
    });
  });
});
