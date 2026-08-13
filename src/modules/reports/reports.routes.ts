/**
 * src/modules/reports/reports.routes.ts
 *
 * Rutas del módulo de reportes.
 * Todas protegidas con requireAuth.
 *
 * Endpoints:
 *   GET /api/v1/reports/sales
 *   GET /api/v1/reports/expenses
 *   GET /api/v1/reports/result
 *   GET /api/v1/reports/top-dishes
 *   GET /api/v1/reports/production
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  reportQuerySchema,
  topDishesQuerySchema,
  productionQuerySchema,
  exportQuerySchema,
} from './reports.schema';
import * as reportsController from './reports.controller';

const router = Router();

router.use(requireAuth);

// GET /api/v1/reports/export?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get(
  '/export',
  validate({ query: exportQuerySchema }),
  reportsController.exportExcelReport,
);

// GET /api/v1/reports/sales?period=day|week|month|custom&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/sales', validate({ query: reportQuerySchema }), reportsController.getSalesReport);

// GET /api/v1/reports/expenses?period=day|week|month|custom&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/expenses', validate({ query: reportQuerySchema }), reportsController.getExpenseReport);

// GET /api/v1/reports/result?period=day|week|month|custom&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/result', validate({ query: reportQuerySchema }), reportsController.getFinancialResult);

// GET /api/v1/reports/top-dishes?period=day|week|month|custom&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&limit=10
router.get('/top-dishes', validate({ query: topDishesQuerySchema }), reportsController.getTopDishes);

// GET /api/v1/reports/production?date=YYYY-MM-DD
router.get(
  '/production',
  validate({ query: productionQuerySchema }),
  reportsController.getProductionSummary,
);

export default router;
