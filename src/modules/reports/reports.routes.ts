/**
 * src/modules/reports/reports.routes.ts
 *
 * Rutas del módulo de reportes — Sprint 3 implementa solo producción.
 *
 * Implementado:
 *   GET /api/v1/reports/production?date=YYYY-MM-DD
 *
 * No implementado (Sprint futuro):
 *   GET /api/v1/reports/sales
 *   GET /api/v1/reports/expenses
 *   GET /api/v1/reports/result
 *   GET /api/v1/reports/top-dishes
 *   GET /api/v1/reports/export
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { productionQuerySchema } from '../orders/orders.schema';
import * as reportsController from './reports.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/v1/reports/production?date=YYYY-MM-DD
router.get(
  '/production',
  validate({ query: productionQuerySchema }),
  reportsController.getProductionSummary,
);

export default router;
