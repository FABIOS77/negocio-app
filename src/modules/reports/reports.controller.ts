/**
 * src/modules/reports/reports.controller.ts
 *
 * Controllers para el módulo de reportes.
 */
import type { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import * as excelExportService from './excel-export.service';
import { sendSuccess } from '../../utils/response';
import type {
  ReportQueryInput,
  TopDishesQueryInput,
  ProductionQueryInput,
  ExportQueryInput,
} from './reports.schema';

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

export async function exportExcelReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { date_from, date_to } = req.query as unknown as ExportQueryInput;
    const buffer = await excelExportService.generateExcelReport(date_from, date_to);

    const filename = `reporte_${date_from}_${date_to}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}
