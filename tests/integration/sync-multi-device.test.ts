/**
 * tests/integration/sync-multi-device.test.ts
 *
 * Test de integración de extremo a extremo para sincronización multi-dispositivo:
 * 1. Dispositivo A realiza PUSH CREATE (Order)
 * 2. Dispositivo B realiza PULL y obtiene el pedido de A
 * 3. Dispositivo B realiza PUSH UPDATE (Order -> DELIVERED)
 * 4. Dispositivo A realiza PULL y obtiene la actualización de B
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const OP_A1 = '550e8400-e29b-41d4-a716-446655440700';
const OP_B1 = '550e8400-e29b-41d4-a716-446655440701';
const ORDER_UUID = '550e8400-e29b-41d4-a716-446655440710';
const USER_A_UUID = '550e8400-e29b-41d4-a716-446655440200';

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

vi.mock('../../src/modules/users/user.model', () => ({ User: { findOne: vi.fn(), findByPk: vi.fn() } }));
vi.mock('../../src/modules/auth/refresh-token.model', () => ({ RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/dishes/dish.model', () => ({ Dish: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/daily-menus/daily-menu.model', () => ({ DailyMenu: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({ DailyMenuDish: { findAll: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/orders/order.model', () => ({ Order: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/orders/order-item.model', () => ({ OrderItem: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/expenses/expense-category.model', () => ({ ExpenseCategory: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/expenses/expense.model', () => ({ Expense: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/sync/sync-operation.model', () => ({ SyncOperation: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() } }));
vi.mock('../../src/modules/sync/change-log.model', () => ({ ChangeLog: { findAll: vi.fn(), create: vi.fn(), init: vi.fn() } }));

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

import { app } from '../../src/app';
import * as syncRepo from '../../src/modules/sync/sync.repository';
import * as ordersService from '../../src/modules/orders/orders.service';

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

describe('Multi-Device Offline Synchronization Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncRepo.findSyncOperation).mockResolvedValue(null);
  });

  it('Device A pushes CREATE order -> Device B pulls -> Device B pushes UPDATE -> Device A pulls update', async () => {
    // 1. Dispositivo A envía PUSH CREATE
    vi.mocked(ordersService.createOrder).mockResolvedValue({
      order: {
        id: ORDER_UUID,
        orderNumber: '20260812-0001',
        customerName: 'Cliente Dispositivo A',
        locationText: null,
        total: 100,
        paymentMethod: 'CASH',
        status: 'PENDING',
        orderedAt: new Date(),
        createdBy: USER_A_UUID,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      },
      created: true,
    });

    vi.mocked(syncRepo.recordChangeLog).mockResolvedValue({
      serverChangeId: '101',
      entityType: 'order',
      entityId: ORDER_UUID,
      operation: 'CREATE',
      snapshot: { id: ORDER_UUID, status: 'PENDING', version: 1 },
      version: 1,
      createdAt: new Date(),
    } as never);

    const pushA = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_A1,
            entity_type: 'order',
            entity_id: ORDER_UUID,
            operation: 'CREATE',
            payload: { customer_name: 'Cliente Dispositivo A', payment_method: 'CASH', items: [] },
            client_timestamp: '2026-08-12T14:00:00.000Z',
          },
        ],
      });

    expect(pushA.status).toBe(200);
    expect(pushA.body.data.results[0].status).toBe('PROCESSED');
    expect(pushA.body.data.results[0].server_change_id).toBe(101);

    // 2. Dispositivo B realiza PULL desde cursor 0
    vi.mocked(syncRepo.getChanges).mockResolvedValue({
      changes: [
        {
          serverChangeId: '101',
          entityType: 'order',
          entityId: ORDER_UUID,
          operation: 'CREATE',
          snapshot: { id: ORDER_UUID, status: 'PENDING', version: 1 },
          version: 1,
          createdAt: new Date(),
        },
      ] as never,
      nextCursor: 101,
      hasMore: false,
    });

    const pullB = await request(app)
      .get('/api/v1/sync/pull?cursor=0')
      .set(AUTH_HEADER);

    expect(pullB.status).toBe(200);
    expect(pullB.body.data.changes).toHaveLength(1);
    expect(pullB.body.data.next_cursor).toBe(101);

    // 3. Dispositivo B envía PUSH UPDATE (status -> DELIVERED) con base_version 1
    vi.mocked(ordersService.getOrder).mockResolvedValue({
      id: ORDER_UUID,
      orderNumber: '20260812-0001',
      customerName: 'Cliente Dispositivo A',
      locationText: null,
      total: 100,
      paymentMethod: 'CASH',
      status: 'PENDING',
      orderedAt: new Date(),
      createdBy: USER_A_UUID,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });

    vi.mocked(ordersService.changeStatus).mockResolvedValue({
      id: ORDER_UUID,
      orderNumber: '20260812-0001',
      customerName: 'Cliente Dispositivo A',
      locationText: null,
      total: 100,
      paymentMethod: 'CASH',
      status: 'DELIVERED',
      orderedAt: new Date(),
      createdBy: USER_A_UUID,
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });

    vi.mocked(syncRepo.recordChangeLog).mockResolvedValue({
      serverChangeId: '102',
      entityType: 'order',
      entityId: ORDER_UUID,
      operation: 'UPDATE',
      snapshot: { id: ORDER_UUID, status: 'DELIVERED', version: 2 },
      version: 2,
      createdAt: new Date(),
    } as never);

    const pushB = await request(app)
      .post('/api/v1/sync/push')
      .set(AUTH_HEADER)
      .send({
        operations: [
          {
            operation_id: OP_B1,
            entity_type: 'order',
            entity_id: ORDER_UUID,
            operation: 'UPDATE',
            payload: { status: 'DELIVERED' },
            client_timestamp: '2026-08-12T14:05:00.000Z',
            base_version: 1,
          },
        ],
      });

    expect(pushB.status).toBe(200);
    expect(pushB.body.data.results[0].status).toBe('PROCESSED');
    expect(pushB.body.data.results[0].server_version).toBe(2);

    // 4. Dispositivo A realiza PULL desde su último cursor 101
    vi.mocked(syncRepo.getChanges).mockResolvedValue({
      changes: [
        {
          serverChangeId: '102',
          entityType: 'order',
          entityId: ORDER_UUID,
          operation: 'UPDATE',
          snapshot: { id: ORDER_UUID, status: 'DELIVERED', version: 2 },
          version: 2,
          createdAt: new Date(),
        },
      ] as never,
      nextCursor: 102,
      hasMore: false,
    });

    const pullA = await request(app)
      .get('/api/v1/sync/pull?cursor=101')
      .set(AUTH_HEADER);

    expect(pullA.status).toBe(200);
    expect(pullA.body.data.changes).toHaveLength(1);
    expect(pullA.body.data.changes[0].server_change_id).toBe(102);
    expect(pullA.body.data.changes[0].data.status).toBe('DELIVERED');
  });
});
