/**
 * src/modules/expenses/expense-categories.service.ts
 *
 * Lógica de negocio para categorías de gastos.
 */
import * as repo from './expense-categories.repository';
import { NotFoundError, ConflictError } from '../../utils/errors';
import type { CreateCategoryInput, UpdateCategoryInput } from './expenses.schema';
import type { ExpenseCategory } from './expense-category.model';

export interface ExpenseCategoryDTO {
  id: string;
  name: string;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function categoryToDTO(cat: ExpenseCategory): ExpenseCategoryDTO {
  return {
    id: cat.id,
    name: cat.name,
    active: cat.active,
    version: cat.version,
    createdAt: cat.createdAt!,
    updatedAt: cat.updatedAt!,
  };
}

export async function listCategories(activeOnly?: boolean): Promise<ExpenseCategoryDTO[]> {
  const categories = await repo.findAll(activeOnly);
  return categories.map(categoryToDTO);
}

export async function createCategory(input: CreateCategoryInput): Promise<ExpenseCategoryDTO> {
  const existing = await repo.findByName(input.name);
  if (existing) {
    throw new ConflictError(`Category '${input.name}' already exists`);
  }

  const category = await repo.create({
    name: input.name,
    active: input.active ?? true,
  });

  return categoryToDTO(category);
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<ExpenseCategoryDTO> {
  const category = await repo.findById(id);
  if (!category) {
    throw new NotFoundError('Expense Category');
  }

  if (input.name && input.name !== category.name) {
    const existing = await repo.findByName(input.name);
    if (existing) {
      throw new ConflictError(`Category '${input.name}' already exists`);
    }
  }

  const updated = await repo.update(category, input);
  return categoryToDTO(updated);
}

export async function deleteCategory(id: string): Promise<{ deactivated: boolean; message: string }> {
  const category = await repo.findById(id);
  if (!category) {
    throw new NotFoundError('Expense Category');
  }

  const count = await repo.countAssociatedExpenses(id);
  if (count > 0) {
    // No eliminar físicamente si tiene gastos históricos vinculados.
    // Se inactiva para prevenir nuevos gastos pero preservar el historial.
    await repo.update(category, { active: false });
    return {
      deactivated: true,
      message: 'Category has historical expenses and was deactivated (active: false) instead of deleted.',
    };
  }

  await repo.remove(category);
  return {
    deactivated: false,
    message: 'Category deleted successfully.',
  };
}
