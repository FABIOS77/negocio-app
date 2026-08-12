/**
 * src/modules/reports/reports.repository.ts
 *
 * Consultas de agregación y reportes financieros / operativos.
 */
import { Op, type WhereOptions } from 'sequelize';
import { Order } from '../orders/order.model';
import { OrderItem } from '../orders/order-item.model';
import { Expense } from '../expenses/expense.model';
import { ExpenseCategory } from '../expenses/expense-category.model';

export interface SalesAggregate {
  totalSales: number;
  orderCount: number;
  byPaymentMethod: {
    CASH: number;
    QR: number;
    OTHER: number;
  };
}

export interface ExpenseCategoryAggregate {
  category_id: string;
  category_name: string;
  total_amount: number;
}

export interface ExpenseAggregate {
  totalExpenses: number;
  expenseCount: number;
  byCategory: ExpenseCategoryAggregate[];
  byPaymentMethod: {
    CASH: number;
    QR: number;
    OTHER: number;
  };
}

export interface TopDishAggregate {
  dish_id: string;
  dish_name: string;
  total_quantity: number;
  total_revenue: number;
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Agregación de ventas en un rango UTC [startUTC, endUTC].
 * Incluye PENDING y DELIVERED. Excluye CANCELLED y soft-deleted.
 */
export async function aggregateSales(startUTC: Date, endUTC: Date): Promise<SalesAggregate> {
  const orders = await Order.findAll({
    where: {
      orderedAt: { [Op.between]: [startUTC, endUTC] },
      status: { [Op.in]: ['PENDING', 'DELIVERED'] },
    } as WhereOptions,
    attributes: ['total', 'paymentMethod'],
    raw: true,
  });

  let totalSales = 0;
  const byPaymentMethod = { CASH: 0, QR: 0, OTHER: 0 };

  for (const order of orders as unknown as Array<{ total: string; paymentMethod: 'CASH' | 'QR' | 'OTHER' }>) {
    const amount = parseFloat(order.total);
    totalSales = round2(totalSales + amount);
    if (order.paymentMethod in byPaymentMethod) {
      byPaymentMethod[order.paymentMethod] = round2(byPaymentMethod[order.paymentMethod] + amount);
    }
  }

  return {
    totalSales,
    orderCount: orders.length,
    byPaymentMethod,
  };
}

/**
 * Agregación de gastos en un rango de fechas [dateFrom, dateTo] (YYYY-MM-DD).
 * Excluye soft-deleted.
 */
export async function aggregateExpenses(dateFrom: string, dateTo: string): Promise<ExpenseAggregate> {
  const expenses = await Expense.findAll({
    where: {
      expenseDate: { [Op.between]: [dateFrom, dateTo] },
    } as WhereOptions,
    include: [
      {
        model: ExpenseCategory,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  let totalExpenses = 0;
  const byPaymentMethod = { CASH: 0, QR: 0, OTHER: 0 };
  const categoryMap = new Map<string, { category_name: string; total_amount: number }>();

  for (const exp of expenses) {
    const amount = parseFloat(exp.amount);
    totalExpenses = round2(totalExpenses + amount);

    const pm = exp.paymentMethod as 'CASH' | 'QR' | 'OTHER';
    if (pm in byPaymentMethod) {
      byPaymentMethod[pm] = round2(byPaymentMethod[pm] + amount);
    }

    const catId = exp.categoryId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catName = (exp as any).category?.name ?? 'Uncategorized';
    const existing = categoryMap.get(catId);
    if (existing) {
      existing.total_amount = round2(existing.total_amount + amount);
    } else {
      categoryMap.set(catId, {
        category_name: catName,
        total_amount: amount,
      });
    }
  }

  const byCategory: ExpenseCategoryAggregate[] = Array.from(categoryMap.entries()).map(
    ([category_id, data]) => ({
      category_id,
      category_name: data.category_name,
      total_amount: data.total_amount,
    }),
  );

  return {
    totalExpenses,
    expenseCount: expenses.length,
    byCategory,
    byPaymentMethod,
  };
}

/**
 * Platos más vendidos en un rango de fechas [startUTC, endUTC].
 * Excluye pedidos CANCELLED.
 * Utiliza OrderItem.unit_price y subtotal históricos.
 */
export async function findTopDishes(
  startUTC: Date,
  endUTC: Date,
  limit: number,
): Promise<TopDishAggregate[]> {
  const items = await OrderItem.findAll({
    attributes: ['dishId', 'dishNameSnapshot', 'quantity', 'subtotal'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          orderedAt: { [Op.between]: [startUTC, endUTC] },
          status: { [Op.in]: ['PENDING', 'DELIVERED'] },
        } as WhereOptions,
        required: true,
      },
    ],
    raw: true,
  });

  const grouped = new Map<string, { dish_name: string; total_quantity: number; total_revenue: number }>();

  for (const item of items as unknown as Array<{
    dishId: string;
    dishNameSnapshot: string;
    quantity: number;
    subtotal: string;
  }>) {
    const revenue = parseFloat(item.subtotal);
    const existing = grouped.get(item.dishId);
    if (existing) {
      existing.total_quantity += item.quantity;
      existing.total_revenue = round2(existing.total_revenue + revenue);
    } else {
      grouped.set(item.dishId, {
        dish_name: item.dishNameSnapshot,
        total_quantity: item.quantity,
        total_revenue: revenue,
      });
    }
  }

  const sorted = Array.from(grouped.entries())
    .map(([dish_id, data]) => ({
      dish_id,
      dish_name: data.dish_name,
      total_quantity: data.total_quantity,
      total_revenue: data.total_revenue,
    }))
    .sort((a, b) => {
      if (b.total_quantity !== a.total_quantity) {
        return b.total_quantity - a.total_quantity;
      }
      return b.total_revenue - a.total_revenue;
    });

  return sorted.slice(0, limit);
}
