/**
 * src/modules/expenses/expenses.controller.ts
 *
 * Controllers para gastos.
 */
import type { Request, Response, NextFunction } from 'express';
import * as expensesService from './expenses.service';
import { sendSuccess } from '../../utils/response';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseQueryInput } from './expenses.schema';

export async function listExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await expensesService.listExpenses(req.query as unknown as ExpenseQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expense = await expensesService.getExpense(req.params['id'] as string);
    sendSuccess(res, expense);
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { expense, created } = await expensesService.createExpense(
      req.body as CreateExpenseInput,
      userId,
    );
    sendSuccess(res, expense, created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expense = await expensesService.updateExpense(
      req.params['id'] as string,
      req.body as UpdateExpenseInput,
    );
    sendSuccess(res, expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await expensesService.deleteExpense(req.params['id'] as string);
    sendSuccess(res, { message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
}
