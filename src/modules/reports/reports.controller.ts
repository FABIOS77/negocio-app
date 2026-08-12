/**
 * src/modules/reports/reports.controller.ts
 *
 * Controller de reportes — Sprint 3 implementa solo producción.
 */
import type { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { sendSuccess } from '../../utils/response';
import type { ProductionQueryInput } from '../orders/orders.schema';

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
