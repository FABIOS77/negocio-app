/**
 * src/modules/expenses/expense-categories.controller.ts
 *
 * Controllers para categorías de gastos.
 */
import type { Request, Response, NextFunction } from 'express';
import * as categoriesService from './expense-categories.service';
import { sendSuccess } from '../../utils/response';
import type { CreateCategoryInput, UpdateCategoryInput } from './expenses.schema';

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query['active'] === 'true';
    const categories = await categoriesService.listCategories(activeOnly);
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoriesService.createCategory(req.body as CreateCategoryInput);
    sendSuccess(res, category, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoriesService.updateCategory(
      req.params['id'] as string,
      req.body as UpdateCategoryInput,
    );
    sendSuccess(res, category);
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await categoriesService.deleteCategory(req.params['id'] as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
