/**
 * src/modules/orders/orders.service.ts
 *
 * Lógica de negocio del módulo de pedidos.
 *
 * Reglas de negocio:
 * - El precio (unit_price) se obtiene SIEMPRE desde la BD, nunca del cliente.
 * - Los subtotales y el total se calculan en el backend.
 * - Los cálculos monetarios usan Math.round(x * 100) / 100 para evitar
 *   errores de punto flotante en JavaScript. Los valores se persisten como
 *   DECIMAL(10,2) en PostgreSQL. Ver ADR-006.
 * - order_number = YYYYMMDD-NNNN, asignado exclusivamente por el servidor.
 *   El contador se obtiene dentro de la transacción de creación.
 * - Idempotencia: si el cliente envía un id UUID que ya existe, se retorna
 *   el pedido existente (HTTP 200, no 201). Ver ADR-007.
 * - Transiciones permitidas: PENDING→DELIVERED, PENDING→CANCELLED.
 *   Los estados DELIVERED y CANCELLED son terminales.
 */
import crypto from 'crypto';
import type { Transaction } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import * as ordersRepo from './orders.repository';
import { Dish } from '../dishes/dish.model';
import { User } from '../users/user.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../utils/errors';
import { buildPagination } from '../../utils/response';
import { dateRangeUTC, toLocalDate } from '../../utils/timezone';
import type {
  CreateOrderInput,
  UpdateOrderInput,
  OrderQueryInput,
  UpdateOrderStatusInput,
} from './orders.schema';
import type { Order, OrderAttributes } from './order.model';
import type { OrderItem } from './order-item.model';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OrderItemDTO {
  id: string;
  dishId: string;
  dishNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  dish?: {
    id: string;
    name: string;
    active: boolean;
  } | null;
}

export interface OrderDTO {
  id: string;
  orderNumber: string | null;
  customerName: string;
  locationText: string | null;
  total: number;
  paymentMethod: string;
  status: string;
  orderedAt: Date;
  createdBy: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemDTO[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Redondea un número a 2 decimales usando aritmética entera para
 * evitar errores de punto flotante en JavaScript.
 * Ejemplo: 0.1 + 0.2 = 0.30000000000000004 → round2(0.3) = 0.30
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function itemToDTO(
  item: OrderItem & { dish?: { id: string; name: string; active: boolean } | null },
): OrderItemDTO {
  return {
    id: item.id,
    dishId: item.dishId,
    dishNameSnapshot: item.dishNameSnapshot,
    quantity: item.quantity,
    unitPrice: parseFloat(item.unitPrice),
    subtotal: parseFloat(item.subtotal),
    dish: item.dish
      ? { id: item.dish.id, name: item.dish.name, active: item.dish.active }
      : null,
  };
}

function orderToDTO(order: Order): OrderDTO {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems: OrderItem[] = (order as any).items ?? [];
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    locationText: order.locationText,
    total: parseFloat(order.total),
    paymentMethod: order.paymentMethod,
    status: order.status,
    orderedAt: order.orderedAt,
    createdBy: order.createdBy,
    version: order.version,
    createdAt: order.createdAt!,
    updatedAt: order.updatedAt!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: rawItems.map((item) => itemToDTO(item as any)),
  };
}

/**
 * Genera el order_number con formato YYYYMMDD-NNNN.
 * El contador es el número de pedidos del mismo día + 1.
 *
 * IMPORTANTE: esta función se llama DENTRO de la transacción de creación
 * para garantizar consistencia. El COUNT usa la misma transacción para
 * leer el estado actual antes del INSERT.
 */
async function generateOrderNumber(orderedAt: Date, transaction: Transaction): Promise<string> {
  const dateStr = toLocalDate(orderedAt);
  const { start, end } = dateRangeUTC(dateStr);
  const count = await ordersRepo.countOrdersForDay(start, end, transaction);
  const seq = String(count + 1).padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${dateStr.replace(/-/g, '')}-${seq}-${randomSuffix}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
): Promise<{ order: OrderDTO; created: boolean }> {
  // 1. Idempotencia: si el id ya existe, retornar el pedido existente
  const orderId = input.id ?? crypto.randomUUID();

  const existing = await ordersRepo.findById(orderId);
  if (existing) {
    return { order: orderToDTO(existing), created: false };
  }

  // 2. Verificar que el usuario autenticado exista y esté activo
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  if (!user.active) {
    throw new BusinessRuleError('User account is inactive');
  }

  // 3. Verificar que todos los dishes existan y estén activos
  const dishIds = input.items.map((item) => item.dish_id);

  // Detectar dish_ids duplicados en el mismo pedido
  const uniqueDishIds = new Set(dishIds);
  if (uniqueDishIds.size !== dishIds.length) {
    throw new BusinessRuleError('A dish cannot appear more than once in the same order');
  }

  const dishes = await Dish.findAll({
    where: { id: dishIds },
    paranoid: false, // incluir soft-deleted para dar mejor mensaje de error
  });

  // Verificar existencia
  if (dishes.length !== dishIds.length) {
    const foundIds = new Set(dishes.map((d) => d.id));
    const missingIds = dishIds.filter((id) => !foundIds.has(id));
    throw new NotFoundError(`Dishes not found: ${missingIds.join(', ')}`);
  }

  // Verificar que estén activos y no soft-deleted
  const inactiveDishes = dishes.filter((d) => !d.active || Boolean(d.deletedAt));
  if (inactiveDishes.length > 0) {
    const names = inactiveDishes.map((d) => d.name).join(', ');
    throw new BusinessRuleError(`The following dishes are inactive or deleted: ${names}`);
  }

  // 4. Obtener precios desde la BD y calcular subtotales
  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  const orderedAt = input.ordered_at ? new Date(input.ordered_at) : new Date();

  // 5. Crear en transacción
  const order = await sequelize.transaction(async (t) => {
    // Generar order_number dentro de la transacción
    const orderNumber = await generateOrderNumber(orderedAt, t);

    // Calcular items con precios desde BD
    let totalAccumulator = 0;

    const itemsData = input.items.map((inputItem) => {
      const dish = dishMap.get(inputItem.dish_id)!;
      const unitPrice = parseFloat(dish.price);
      const subtotal = round2(unitPrice * inputItem.quantity);
      totalAccumulator = round2(totalAccumulator + subtotal);

      return {
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        quantity: inputItem.quantity,
        unitPrice: String(unitPrice),
        subtotal: String(subtotal),
      };
    });

    const total = totalAccumulator;

    return ordersRepo.create(
      {
        id: orderId,
        orderNumber,
        customerName: input.customer_name,
        locationText: input.location_text ?? null,
        total: String(total),
        paymentMethod: input.payment_method,
        status: 'PENDING',
        orderedAt,
        createdBy: userId,
      },
      itemsData,
      t,
    );
  });

  // Recargar con includes para el DTO completo
  const fullOrder = await ordersRepo.findById(order.id);
  if (!fullOrder) throw new NotFoundError('Order');

  return { order: orderToDTO(fullOrder), created: true };
}

export async function listOrders(query: OrderQueryInput) {
  const filters: ordersRepo.OrderFilters = {};

  if (query.status) {
    filters.status = query.status;
  }

  if (query.date) {
    const { start, end } = dateRangeUTC(query.date);
    filters.dateStart = start;
    filters.dateEnd = end;
  }

  const { count, rows } = await ordersRepo.findAll(filters, {
    page: query.page,
    limit: query.limit,
  });

  return {
    data: rows.map(orderToDTO),
    pagination: buildPagination(count, query.page, query.limit),
  };
}

export async function getOrder(id: string): Promise<OrderDTO> {
  const order = await ordersRepo.findById(id);
  if (!order) throw new NotFoundError('Order');
  return orderToDTO(order);
}

export async function changeStatus(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderDTO> {
  const order = await ordersRepo.findByIdRaw(id);
  if (!order) throw new NotFoundError('Order');

  const currentStatus = order.status;
  const newStatus = input.status;

  // Validar transiciones
  // PENDING → DELIVERED ✓
  // PENDING → CANCELLED ✓
  // DELIVERED → * ✗ (terminal)
  // CANCELLED → * ✗ (terminal)
  if (currentStatus !== 'PENDING') {
    throw new ConflictError(
      `Cannot change status from ${currentStatus} to ${newStatus}. Only PENDING orders can be updated.`,
    );
  }

  const updated = await ordersRepo.updateStatus(order, newStatus);

  // Recargar con items para DTO completo
  const full = await ordersRepo.findById(updated.id);
  if (!full) throw new NotFoundError('Order');
  return orderToDTO(full);
}

export async function updateOrder(
  id: string,
  input: UpdateOrderInput,
): Promise<OrderDTO> {
  const order = await ordersRepo.findByIdRaw(id);
  if (!order) throw new NotFoundError('Order');

  // No permitir edición si el pedido ya está en estado terminal (DELIVERED o CANCELLED)
  if (order.status !== 'PENDING') {
    throw new BusinessRuleError(
      `Cannot update an order in terminal status (${order.status}). Only PENDING orders can be updated.`,
    );
  }

  const orderUpdates: Partial<OrderAttributes> = {};
  if (input.customer_name !== undefined) orderUpdates.customerName = input.customer_name;
  if (input.location_text !== undefined) orderUpdates.locationText = input.location_text ?? null;
  if (input.payment_method !== undefined) orderUpdates.paymentMethod = input.payment_method;
  if (input.ordered_at !== undefined) orderUpdates.orderedAt = new Date(input.ordered_at);

  let newItemsData: ordersRepo.OrderItemData[] | null = null;

  if (input.items && input.items.length > 0) {
    const dishIds = input.items.map((item) => item.dish_id);

    // Detectar dish_ids duplicados
    const uniqueDishIds = new Set(dishIds);
    if (uniqueDishIds.size !== dishIds.length) {
      throw new BusinessRuleError('A dish cannot appear more than once in the same order');
    }

    const dishes = await Dish.findAll({
      where: { id: dishIds },
      paranoid: false,
    });

    if (dishes.length !== dishIds.length) {
      const foundIds = new Set(dishes.map((d) => d.id));
      const missingIds = dishIds.filter((dishId) => !foundIds.has(dishId));
      throw new NotFoundError(`Dishes not found: ${missingIds.join(', ')}`);
    }

    const inactiveDishes = dishes.filter((d) => !d.active || Boolean(d.deletedAt));
    if (inactiveDishes.length > 0) {
      const names = inactiveDishes.map((d) => d.name).join(', ');
      throw new BusinessRuleError(`The following dishes are inactive or deleted: ${names}`);
    }

    const dishMap = new Map(dishes.map((d) => [d.id, d]));
    let totalAccumulator = 0;

    newItemsData = input.items.map((inputItem) => {
      const dish = dishMap.get(inputItem.dish_id)!;
      const unitPrice = parseFloat(dish.price);
      const subtotal = round2(unitPrice * inputItem.quantity);
      totalAccumulator = round2(totalAccumulator + subtotal);

      return {
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        quantity: inputItem.quantity,
        unitPrice: String(unitPrice),
        subtotal: String(subtotal),
      };
    });

    orderUpdates.total = String(totalAccumulator);
  }

  await ordersRepo.updateWithItems(order, orderUpdates, newItemsData);

  const full = await ordersRepo.findById(id);
  if (!full) throw new NotFoundError('Order');
  return orderToDTO(full);
}

export async function deleteOrder(id: string): Promise<void> {
  const order = await ordersRepo.findByIdRaw(id);
  if (!order) throw new NotFoundError('Order');

  await ordersRepo.softDelete(order);
}
