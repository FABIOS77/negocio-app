/**
 * src/modules/expenses/expenses.repository.ts
 *
 * Acceso a datos para gastos.
 */
import { Op, type WhereOptions } from 'sequelize';
import { Expense, type ExpenseCreationAttributes } from './expense.model';
import { ExpenseCategory } from './expense-category.model';
import { User } from '../users/user.model';
import type { PaymentMethod } from '../orders/order.model';

export interface ExpenseFilters {
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export async function findById(id: string): Promise<Expense | null> {
  return Expense.findByPk(id, {
    include: [
      {
        model: ExpenseCategory,
        as: 'category',
        attributes: ['id', 'name', 'active'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });
}

export async function findByIdRaw(id: string): Promise<Expense | null> {
  return Expense.findByPk(id);
}

export async function findAll(filters: ExpenseFilters, pagination: PaginationOptions) {
  const where: WhereOptions = {};

  if (filters.categoryId) {
    where['categoryId'] = filters.categoryId;
  }

  if (filters.paymentMethod) {
    where['paymentMethod'] = filters.paymentMethod;
  }

  if (filters.dateFrom && filters.dateTo) {
    where['expenseDate'] = {
      [Op.between]: [filters.dateFrom, filters.dateTo],
    };
  } else if (filters.dateFrom) {
    where['expenseDate'] = {
      [Op.gte]: filters.dateFrom,
    };
  } else if (filters.dateTo) {
    where['expenseDate'] = {
      [Op.lte]: filters.dateTo,
    };
  }

  const { count, rows } = await Expense.findAndCountAll({
    where,
    include: [
      {
        model: ExpenseCategory,
        as: 'category',
        attributes: ['id', 'name', 'active'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit,
    order: [
      ['expense_date', 'DESC'],
      ['created_at', 'DESC'],
    ],
  });

  return { count, rows };
}

export async function create(data: ExpenseCreationAttributes): Promise<Expense> {
  return Expense.create(data);
}

export async function update(
  expense: Expense,
  data: Partial<ExpenseCreationAttributes>,
): Promise<Expense> {
  return expense.update({
    ...data,
    version: expense.version + 1,
  });
}

export async function softDelete(expense: Expense): Promise<void> {
  await expense.destroy();
}
