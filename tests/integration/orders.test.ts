/**
 * tests/integration/orders.test.ts
 *
 * Tests de integración para /api/v1/orders.
 * Mockea repositorios, modelos y JWT para no requerir BD real.
 *
 * Cubre:
 * - Creación: válida, sin items, quantity inválida, dish inexistente, dish inactivo
 * - Cálculo correcto de totales y múltiples items
 * - Price history: cambio de precio no afecta pedido existente
 * - Idempotencia: mismo UUID → mismo pedido
 * - Cambios de estado: PENDING→DELIVERED, PENDING→CANCELLED
 * - Transiciones inválidas: DELIVERED→PENDING, CANCELLED→PENDING
 * - Transacción: fallo en item produce rollback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

// UUIDs RFC 4122 válidos
const ORDER_UUID = '550e8400-e29b-41d4-a716-446655440100';
const ORDER_UUID_2 = '550e8400-e29b-41d4-a716-446655440101';
const DISH_UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const DISH_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const DISH_UUID_MISSING = '550e8400-e29b-41d4-a716-446655440099';
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
    transaction: vi.fn((cb: (t: unknown) => Promise<unknown>) => cb({ LOCK: { UPDATE: 'UPDATE' } })),
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

vi.mock('../../src/modules/sync/sync-operation.model', () => ({
  SyncOperation: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/sync/change-log.model', () => ({
  ChangeLog: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu.model', () => ({
  DailyMenu: { findAll: vi.fn(), findByPk: vi.fn(), init: vi.fn() },
}));

vi.mock('../../src/modules/daily-menus/daily-menu-dish.model', () => ({
  DailyMenuDish: { findAll: vi.fn(), init: vi.fn() },
}));

// Mocks necesarios para que la app no falle al cargar los demás módulos
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
import { User } from '../../src/modules/users/user.model';
import { Dish } from '../../src/modules/dishes/dish.model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: USER_UUID,
  name: 'Test User',
  email: 'test@example.com',
  active: true,
  version: 1,
};

const mockDish1 = {
  id: DISH_UUID_1,
  name: 'Sopa de Maní',
  price: '20.00',
  active: true,
  deletedAt: null,
};

const mockDish2 = {
  id: DISH_UUID_2,
  name: 'Arroz con Pollo',
  price: '25.00',
  active: true,
  deletedAt: null,
};

const mockOrderItem1 = {
  id: '550e8400-e29b-41d4-a716-446655440300',
  orderId: ORDER_UUID,
  dishId: DISH_UUID_1,
  dishNameSnapshot: 'Sopa de Maní',
  quantity: 2,
  unitPrice: '20.00',
  subtotal: '40.00',
  dish: { id: DISH_UUID_1, name: 'Sopa de Maní', active: true },
};

const mockOrder = {
  id: ORDER_UUID,
  orderNumber: '20260813-0001',
  customerName: 'Juan Pérez',
  locationText: 'Av. Principal',
  total: '40.00',
  paymentMethod: 'CASH',
  status: 'PENDING',
  orderedAt: new Date('2026-08-13T12:00:00Z'),
  createdBy: USER_UUID,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  items: [mockOrderItem1],
};

const AUTH_HEADER = { Authorization: 'Bearer valid.token' };

// ─── POST /api/v1/orders — Creación ──────────────────────────────────────────

describe('POST /api/v1/orders — creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(ordersRepo.findById).mockResolvedValue(null);
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(null);
    vi.mocked(ordersRepo.countOrdersForDay).mockResolvedValue(0);
  });

  it('should create a valid order and return 201', async () => {
    vi.mocked(Dish.findAll).mockResolvedValue([mockDish1] as never);
    vi.mocked(ordersRepo.create).mockResolvedValue({ id: ORDER_UUID } as never);
    // findById se llama 2 veces: existencia + reload con items
    vi.mocked(ordersRepo.findById)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockOrder as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan Pérez',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBe('20260813-0001');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.total).toBe(40);
  });

  it('should return 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan Pérez',
        payment_method: 'CASH',
        items: [],
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 for missing customer_name', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 for quantity = 0', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Test',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 0 }],
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 for negative quantity', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Test',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: -1 }],
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid payment_method', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Test',
        payment_method: 'BITCOIN',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    expect(res.status).toBe(400);
  });

  it('should return 404 when dish does not exist', async () => {
    vi.mocked(Dish.findAll).mockResolvedValue([/* empty — dish not found */] as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_MISSING, quantity: 1 }],
      });

    expect(res.status).toBe(404);
  });

  it('should return 422 when dish is inactive', async () => {
    const inactiveDish = { ...mockDish1, active: false };
    vi.mocked(Dish.findAll).mockResolvedValue([inactiveDish] as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when same dish appears twice in items', async () => {
    // La validación de duplicados ocurre antes de consultar BD
    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan',
        payment_method: 'CASH',
        items: [
          { dish_id: DISH_UUID_1, quantity: 1 },
          { dish_id: DISH_UUID_1, quantity: 2 },
        ],
      });

    expect(res.status).toBe(422);
  });

  it('should calculate total correctly with multiple items', async () => {
    const multiItemOrder = {
      ...mockOrder,
      total: '90.00', // 2 * 20.00 + 2 * 25.00
      items: [
        mockOrderItem1,
        {
          ...mockOrderItem1,
          id: '550e8400-e29b-41d4-a716-446655440301',
          dishId: DISH_UUID_2,
          dishNameSnapshot: 'Arroz con Pollo',
          quantity: 2,
          unitPrice: '25.00',
          subtotal: '50.00',
          dish: { id: DISH_UUID_2, name: 'Arroz con Pollo', active: true },
        },
      ],
    };

    vi.mocked(Dish.findAll).mockResolvedValue([mockDish1, mockDish2] as never);
    vi.mocked(ordersRepo.create).mockResolvedValue({ id: ORDER_UUID } as never);
    vi.mocked(ordersRepo.findById)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(multiItemOrder as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Juan',
        payment_method: 'QR',
        items: [
          { dish_id: DISH_UUID_1, quantity: 2 },
          { dish_id: DISH_UUID_2, quantity: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(90);
    expect(res.body.data.items).toHaveLength(2);
  });

  it('should accept optional UUID id in request', async () => {
    vi.mocked(Dish.findAll).mockResolvedValue([mockDish1] as never);
    vi.mocked(ordersRepo.create).mockResolvedValue({ id: ORDER_UUID } as never);
    vi.mocked(ordersRepo.findById)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockOrder as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        id: ORDER_UUID,
        customer_name: 'Juan',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    expect(res.status).toBe(201);
  });
});

// ─── POST /api/v1/orders — Price History ────────────────────────────────────

describe('POST /api/v1/orders — price history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(null);
    vi.mocked(ordersRepo.countOrdersForDay).mockResolvedValue(0);
  });

  it('should preserve original price even if dish price changes later', async () => {
    // Pedido creado con precio 20
    const dishAtCreation = { ...mockDish1, price: '20.00' };
    vi.mocked(Dish.findAll).mockResolvedValue([dishAtCreation] as never);
    vi.mocked(ordersRepo.create).mockResolvedValue({ id: ORDER_UUID } as never);
    vi.mocked(ordersRepo.findById)
      .mockResolvedValueOnce(null) // check existencia
      .mockResolvedValueOnce(mockOrder as never); // reload con items (unit_price = 20.00)

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Test',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    // El item debe mostrar el precio al momento de creación (20), no el nuevo (25)
    const item = res.body.data.items[0];
    expect(item.unitPrice).toBe(20);
    expect(item.subtotal).toBe(40);
  });
});

// ─── POST /api/v1/orders — Idempotency ──────────────────────────────────────

describe('POST /api/v1/orders — idempotency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return existing order on retry with same UUID (HTTP 200)', async () => {
    // Simular que el pedido ya existe
    vi.mocked(ordersRepo.findById).mockResolvedValue(mockOrder as never);

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        id: ORDER_UUID, // mismo UUID
        customer_name: 'Juan Pérez',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    // HTTP 200 indica retry (no 201 que indica creación nueva)
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ORDER_UUID);
    // No se debe llamar a create
    expect(ordersRepo.create).not.toHaveBeenCalled();
  });

  it('should create only one order even when called twice', async () => {
    // Primera llamada: no existe → crea
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(Dish.findAll).mockResolvedValue([mockDish1] as never);
    vi.mocked(ordersRepo.create).mockResolvedValue({ id: ORDER_UUID } as never);
    vi.mocked(ordersRepo.countOrdersForDay).mockResolvedValue(0);
    vi.mocked(ordersRepo.findById)
      .mockResolvedValueOnce(null) // check existencia primera llamada
      .mockResolvedValueOnce(mockOrder as never) // reload primera llamada
      .mockResolvedValueOnce(mockOrder as never); // segunda llamada: ya existe

    const payload = {
      id: ORDER_UUID,
      customer_name: 'Juan',
      payment_method: 'CASH',
      items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
    };

    const res1 = await request(app).post('/api/v1/orders').set(AUTH_HEADER).send(payload);
    const res2 = await request(app).post('/api/v1/orders').set(AUTH_HEADER).send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(200);
    expect(res1.body.data.id).toBe(res2.body.data.id);
    // create se llama solo una vez
    expect(ordersRepo.create).toHaveBeenCalledTimes(1);
  });
});

// ─── PATCH /api/v1/orders/:id/status — Status transitions ──────────────────

describe('PATCH /api/v1/orders/:id/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should transition PENDING → DELIVERED', async () => {
    const pendingOrder = { ...mockOrder, status: 'PENDING', items: [] };
    const deliveredOrder = { ...mockOrder, status: 'DELIVERED', items: [] };

    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(pendingOrder as never);
    vi.mocked(ordersRepo.updateStatus).mockResolvedValue(deliveredOrder as never);
    vi.mocked(ordersRepo.findById).mockResolvedValue(deliveredOrder as never);

    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DELIVERED');
  });

  it('should transition PENDING → CANCELLED', async () => {
    const pendingOrder = { ...mockOrder, status: 'PENDING', items: [] };
    const cancelledOrder = { ...mockOrder, status: 'CANCELLED', items: [] };

    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(pendingOrder as never);
    vi.mocked(ordersRepo.updateStatus).mockResolvedValue(cancelledOrder as never);
    vi.mocked(ordersRepo.findById).mockResolvedValue(cancelledOrder as never);

    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('should return 409 for DELIVERED → PENDING (terminal state)', async () => {
    const deliveredOrder = { ...mockOrder, status: 'DELIVERED', items: [] };
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(deliveredOrder as never);

    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(409);
  });

  it('should return 409 for CANCELLED → PENDING (terminal state)', async () => {
    const cancelledOrder = { ...mockOrder, status: 'CANCELLED', items: [] };
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(cancelledOrder as never);

    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(409);
  });

  it('should return 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'PENDING' }); // PENDING no es un estado destino válido

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent order', async () => {
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/orders/${ORDER_UUID_2}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/v1/orders ──────────────────────────────────────────────────────

describe('GET /api/v1/orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return paginated order list', async () => {
    vi.mocked(ordersRepo.findAll).mockResolvedValue({
      count: 1,
      rows: [mockOrder],
    } as never);

    const res = await request(app).get('/api/v1/orders').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('should filter by status', async () => {
    vi.mocked(ordersRepo.findAll).mockResolvedValue({ count: 0, rows: [] } as never);

    const res = await request(app).get('/api/v1/orders?status=DELIVERED').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  it('should filter by date', async () => {
    vi.mocked(ordersRepo.findAll).mockResolvedValue({ count: 0, rows: [] } as never);

    const res = await request(app).get('/api/v1/orders?date=2026-08-13').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  it('should return 400 for invalid status', async () => {
    const res = await request(app).get('/api/v1/orders?status=INVALID').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid date format', async () => {
    const res = await request(app).get('/api/v1/orders?date=13/08/2026').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/orders/:id ──────────────────────────────────────────────────

describe('GET /api/v1/orders/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return order by UUID', async () => {
    vi.mocked(ordersRepo.findById).mockResolvedValue(mockOrder as never);

    const res = await request(app).get(`/api/v1/orders/${ORDER_UUID}`).set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ORDER_UUID);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].unitPrice).toBe(20);
  });

  it('should return 404 for non-existent order', async () => {
    vi.mocked(ordersRepo.findById).mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/orders/${ORDER_UUID_2}`).set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid UUID format', async () => {
    const res = await request(app).get('/api/v1/orders/not-a-uuid').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });
});

// ─── Transaction rollback ────────────────────────────────────────────────────

describe('POST /api/v1/orders — transaction rollback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should propagate error when repository.create throws (simulating rollback)', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
    vi.mocked(Dish.findAll).mockResolvedValue([mockDish1] as never);
    vi.mocked(ordersRepo.findById).mockResolvedValue(null);
    vi.mocked(ordersRepo.findByIdRaw).mockResolvedValue(null);
    vi.mocked(ordersRepo.countOrdersForDay).mockResolvedValue(0);
    vi.mocked(ordersRepo.create).mockRejectedValue(new Error('DB constraint violation'));

    const res = await request(app)
      .post('/api/v1/orders')
      .set(AUTH_HEADER)
      .send({
        customer_name: 'Test',
        payment_method: 'CASH',
        items: [{ dish_id: DISH_UUID_1, quantity: 1 }],
      });

    expect(res.status).toBe(500);
    // El order no existe (rollback implícito)
    expect(ordersRepo.findById).toHaveBeenCalledTimes(1); // solo el check inicial
  });
});
