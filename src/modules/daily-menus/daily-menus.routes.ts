/**
 * src/modules/daily-menus/daily-menus.routes.ts
 *
 * Rutas del módulo de menú diario — todas protegidas con requireAuth.
 *
 * IMPORTANTE: /today y /draw deben declararse ANTES de /:id
 * para que Express no los interprete como un UUID.
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createDailyMenuSchema,
  updateDailyMenuSchema,
  dailyMenuQuerySchema,
  uuidParamSchema,
  drawSchema,
} from './daily-menus.schema';
import * as menusController from './daily-menus.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/v1/daily-menus
router.get('/', validate({ query: dailyMenuQuerySchema }), menusController.listMenus);

// GET /api/v1/daily-menus/today  — debe ir ANTES de /:id
router.get('/today', menusController.getTodayMenu);

// POST /api/v1/daily-menus/draw  — debe ir ANTES de /:id
router.post('/draw', validate({ body: drawSchema }), menusController.drawDishes);

// POST /api/v1/daily-menus
router.post('/', validate({ body: createDailyMenuSchema }), menusController.createMenu);

// GET /api/v1/daily-menus/:id
router.get('/:id', validate({ params: uuidParamSchema }), menusController.getMenu);

// PUT /api/v1/daily-menus/:id
router.put(
  '/:id',
  validate({ params: uuidParamSchema, body: updateDailyMenuSchema }),
  menusController.updateMenu,
);

export default router;
