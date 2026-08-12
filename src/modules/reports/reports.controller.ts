/**
 * src/modules/reports/reports.controller.ts
 *
 * Controllers para el módulo de reportes.
 */
import type { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { sendSuccess } from '../../utils/response';
import type { ReportQueryInput, TopDishesQueryInput, ProductionQueryInput } from './reports.schema';

export async function getSalesReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportsService.getSalesReport(req.query as unknown as ReportQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getExpenseReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportsService.getExpenseReport(req.query as unknown as ReportQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getFinancialResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportsService.getFinancialResult(req.query as unknown as ReportQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getTopDishes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportsService.getTopDishes(req.query as unknown as TopDishesQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getProductionSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportsService.getProductionSummary(
      req.query as unknown as ProductionQueryInput,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
