/**
 * src/modules/expenses/expense-categories.repository.ts
 *
 * Acceso a datos para categorías de gastos.
 */
import type { WhereOptions } from 'sequelize';
import { ExpenseCategory, type ExpenseCategoryCreationAttributes } from './expense-category.model';
import { Expense } from './expense.model';

export async function findAll(activeOnly?: boolean): Promise<ExpenseCategory[]> {
  const where: WhereOptions = {};
  if (activeOnly) {
    where['active'] = true;
  }
  return ExpenseCategory.findAll({
    where,
    order: [['name', 'ASC']],
  });
}

export async function findById(id: string): Promise<ExpenseCategory | null> {
  return ExpenseCategory.findByPk(id);
}

export async function findByName(name: string): Promise<ExpenseCategory | null> {
  return ExpenseCategory.findOne({ where: { name } });
}

export async function create(
  data: ExpenseCategoryCreationAttributes,
): Promise<ExpenseCategory> {
  return ExpenseCategory.create(data);
}

export async function update(
  category: ExpenseCategory,
  data: Partial<ExpenseCategoryCreationAttributes>,
): Promise<ExpenseCategory> {
  return category.update({
    ...data,
    version: category.version + 1,
  });
}

/**
 * Cuenta cuántos gastos (activos o soft-deleted) están vinculados a esta categoría.
 */
export async function countAssociatedExpenses(categoryId: string): Promise<number> {
  return Expense.count({
    where: { categoryId } as WhereOptions,
    paranoid: false, // Incluye históricos aunque estén soft deleted
  });
}

export async function remove(category: ExpenseCategory): Promise<void> {
  await category.destroy();
}
