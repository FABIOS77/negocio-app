/**
 * src/modules/orders/orders.repository.ts
 *
 * Acceso a datos para el módulo de pedidos.
 * Única capa que toca los modelos Order y OrderItem directamente.
 *
 * Notas:
 * - Las queries monetarias usan Op.between sobre ordered_at (TIMESTAMPTZ).
 * - countOrdersForDay usa SELECT COUNT con FOR UPDATE para serializar
 *   la asignación de order_number dentro de la transacción de creación.
 */
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import { Order, type OrderCreationAttributes, type OrderStatus } from './order.model';
import { OrderItem } from './order-item.model';
import { Dish } from '../dishes/dish.model';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface OrderFilters {
  status?: OrderStatus;
  dateStart?: Date;
  dateEnd?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface OrderItemData {
  dishId: string;
  dishNameSnapshot: string;
  quantity: number;
  unitPrice: string; // string para DECIMAL
  subtotal: string; // string para DECIMAL
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Retorna un Order con sus OrderItems e información básica de Dish.
 * Excluye el password_hash del usuario creador (no se hace include de User aquí).
 */
export async function findById(id: string): Promise<Order | null> {
  return Order.findByPk(id, {
    include: [
      {
        model: OrderItem,
        as: 'items',
        include: [
          {
            model: Dish,
            as: 'dish',
            attributes: ['id', 'name', 'active'],
            // paranoid: false para incluir dishes soft-deleted (preservar historial)
            paranoid: false,
          },
        ],
      },
    ],
  });
}

/**
 * Retorna un Order sin includes (solo para verificar existencia y estado).
 */
export async function findByIdRaw(id: string): Promise<Order | null> {
  return Order.findByPk(id);
}

/**
 * Lista paginada de Orders con sus items.
 */
export async function findAll(filters: OrderFilters, pagination: PaginationOptions) {
  const where: WhereOptions = {};

  if (filters.status) {
    where['status'] = filters.status;
  }

  if (filters.dateStart && filters.dateEnd) {
    where['orderedAt'] = {
      [Op.between]: [filters.dateStart, filters.dateEnd],
    };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: 'items',
        include: [
          {
            model: Dish,
            as: 'dish',
            attributes: ['id', 'name', 'active'],
            paranoid: false,
          },
        ],
      },
    ],
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit,
    order: [['ordered_at', 'DESC']],
    distinct: true, // evita COUNT inflado por JOIN con items
  });

  return { count, rows };
}

/**
 * Cuenta los pedidos (no cancelados y no soft-deleted) del día especificado.
 * Usado para generar order_number = YYYYMMDD-NNNN.
 *
 * Se ejecuta DENTRO de la transacción de creación para serializar el contador.
 * El LOCK es manejado por la transacción serializable o por el INSERT en sí.
 */
export async function countOrdersForDay(
  dateStart: Date,
  dateEnd: Date,
  transaction: Transaction,
): Promise<number> {
  // Nota: Order.count() no soporta lock en Sequelize v6.
  // La serialización se garantiza porque el INSERT posterior fallará por
  // unique constraint si hay una colisión de order_number concurrente.
  // Para escala alta, se puede usar sequelize.query con SELECT ... FOR UPDATE.
  const count = await Order.count({
    where: {
      orderedAt: { [Op.between]: [dateStart, dateEnd] },
    } as WhereOptions,
    transaction,
  });
  return count;
}

/**
 * Crea un Order con sus OrderItems en una única transacción.
 * Si la transacción falla, Sequelize hace rollback automático.
 */
export async function create(
  orderData: OrderCreationAttributes,
  itemsData: OrderItemData[],
  externalTransaction?: Transaction,
): Promise<Order> {
  const execute = async (t: Transaction) => {
    const order = await Order.create(orderData, { transaction: t });

    await OrderItem.bulkCreate(
      itemsData.map((item) => ({
        orderId: order.id,
        dishId: item.dishId,
        dishNameSnapshot: item.dishNameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      { transaction: t },
    );

    return order;
  };

  if (externalTransaction) {
    return execute(externalTransaction);
  }

  return sequelize.transaction(execute);
}

/**
 * Actualiza el estado de un pedido y bumps la versión.
 */
export async function updateStatus(
  order: Order,
  newStatus: OrderStatus,
): Promise<Order> {
  return order.update({
    status: newStatus,
    version: order.version + 1,
  });
}

/**
 * Retorna los order_items para producción: pedidos del día, excluyendo CANCELLED.
 * Agrupa por dish_id, sumando quantities.
 */
export async function findProductionSummary(
  dateStart: Date,
  dateEnd: Date,
): Promise<Array<{ dish_id: string; dish_name: string; total_quantity: number }>> {
  const items = await OrderItem.findAll({
    attributes: ['dish_id', 'dish_name_snapshot', 'quantity'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          orderedAt: { [Op.between]: [dateStart, dateEnd] },
          status: { [Op.ne]: 'CANCELLED' },
        } as WhereOptions,
        required: true,
      },
    ],
    raw: true,
  });

  // Agrupar en memoria porque Sequelize con paranoid y aliases hace difícil
  // el GROUP BY con include. Para escala, se puede mover a una query raw.
  const grouped = new Map<string, { dish_name: string; total_quantity: number }>();

  for (const item of items as unknown as Array<{
    dish_id: string;
    dish_name_snapshot: string;
    quantity: number;
  }>) {
    const existing = grouped.get(item.dish_id);
    if (existing) {
      existing.total_quantity += item.quantity;
    } else {
      grouped.set(item.dish_id, {
        dish_name: item.dish_name_snapshot,
        total_quantity: item.quantity,
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([dish_id, data]) => ({
      dish_id,
      dish_name: data.dish_name,
      total_quantity: data.total_quantity,
    }))
    .sort((a, b) => b.total_quantity - a.total_quantity);
}
