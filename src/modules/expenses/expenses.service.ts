/**
 * src/modules/expenses/expenses.service.ts
 *
 * Lógica de negocio para gastos.
 *
 * Reglas:
 * - Redondeo monetario a 2 decimales.
 * - Idempotencia en POST /expenses por UUID (mismo UUID = retorna existente HTTP 200).
 * - La categoría asignada debe existir y estar activa (`active === true`).
 * - Soft delete por deleted_at.
 */
import crypto from 'crypto';
import * as repo from './expenses.repository';
import { ExpenseCategory } from './expense-category.model';
import { User } from '../users/user.model';
import { NotFoundError, BusinessRuleError } from '../../utils/errors';
import { buildPagination } from '../../utils/response';
import { getTodayInLaPaz } from '../../utils/timezone';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseQueryInput } from './expenses.schema';
import type { Expense, ExpenseCreationAttributes } from './expense.model';

export interface ExpenseDTO {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  paymentMethod: string;
  expenseDate: string;
  createdBy: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    active: boolean;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function expenseToDTO(expense: Expense): ExpenseDTO {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCat = (expense as any).category;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCreator = (expense as any).creator;

  return {
    id: expense.id,
    description: expense.description,
    amount: parseFloat(expense.amount),
    categoryId: expense.categoryId,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
    createdBy: expense.createdBy,
    version: expense.version,
    createdAt: expense.createdAt!,
    updatedAt: expense.updatedAt!,
    category: rawCat ? { id: rawCat.id, name: rawCat.name, active: rawCat.active } : null,
    creator: rawCreator ? { id: rawCreator.id, name: rawCreator.name, email: rawCreator.email } : null,
  };
}

export async function createExpense(
  input: CreateExpenseInput,
  userId: string,
): Promise<{ expense: ExpenseDTO; created: boolean }> {
  const expenseId = input.id ?? crypto.randomUUID();

  // 1. Idempotencia: si el id ya existe, retornar el gasto existente
  const existing = await repo.findById(expenseId);
  if (existing) {
    return { expense: expenseToDTO(existing), created: false };
  }

  // 2. Verificar usuario
  const user = await User.findByPk(userId);
  if (!user || !user.active) {
    throw new BusinessRuleError('User account is inactive or missing');
  }

  // 3. Verificar categoría existente y activa
  const category = await ExpenseCategory.findByPk(input.category_id);
  if (!category) {
    throw new NotFoundError('Expense Category');
  }
  if (!category.active) {
    throw new BusinessRuleError(`Expense category '${category.name}' is inactive`);
  }

  const expenseDate = input.expense_date ?? getTodayInLaPaz();
  const amountStr = String(round2(input.amount));

  const newExpense = await repo.create({
    id: expenseId,
    description: input.description,
    amount: amountStr,
    categoryId: input.category_id,
    paymentMethod: input.payment_method,
    expenseDate,
    createdBy: userId,
  });

  const reloaded = await repo.findById(newExpense.id);
  return { expense: expenseToDTO(reloaded ?? newExpense), created: true };
}

export async function listExpenses(query: ExpenseQueryInput) {
  const { count, rows } = await repo.findAll(
    {
      categoryId: query.category_id,
      dateFrom: query.date_from,
      dateTo: query.date_to,
    },
    {
      page: query.page,
      limit: query.limit,
    },
  );

  return {
    data: rows.map(expenseToDTO),
    pagination: buildPagination(count, query.page, query.limit),
  };
}

export async function getExpense(id: string): Promise<ExpenseDTO> {
  const expense = await repo.findById(id);
  if (!expense) {
    throw new NotFoundError('Expense');
  }
  return expenseToDTO(expense);
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseDTO> {
  const expense = await repo.findByIdRaw(id);
  if (!expense) {
    throw new NotFoundError('Expense');
  }

  const updateData: Partial<ExpenseCreationAttributes> = {};

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.amount !== undefined) {
    updateData.amount = String(round2(input.amount));
  }

  if (input.payment_method !== undefined) {
    updateData.paymentMethod = input.payment_method;
  }

  if (input.expense_date !== undefined) {
    updateData.expenseDate = input.expense_date;
  }

  if (input.category_id !== undefined && input.category_id !== expense.categoryId) {
    const category = await ExpenseCategory.findByPk(input.category_id);
    if (!category) {
      throw new NotFoundError('Expense Category');
    }
    if (!category.active) {
      throw new BusinessRuleError(`Expense category '${category.name}' is inactive`);
    }
    updateData.categoryId = input.category_id;
  }

  await repo.update(expense, updateData);

  const reloaded = await repo.findById(expense.id);
  return expenseToDTO(reloaded!);
}

export async function deleteExpense(id: string): Promise<void> {
  const expense = await repo.findByIdRaw(id);
  if (!expense) {
    throw new NotFoundError('Expense');
  }

  await repo.softDelete(expense);
}
