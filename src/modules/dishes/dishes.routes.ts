/**
 * src/modules/dishes/dishes.routes.ts
 *
 * Rutas del CRUD de platos — todas protegidas con requireAuth.
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createDishSchema,
  updateDishSchema,
  dishQuerySchema,
  uuidParamSchema,
} from './dishes.schema';
import * as dishesController from './dishes.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/v1/dishes
router.get('/', validate({ query: dishQuerySchema }), dishesController.listDishes);

// POST /api/v1/dishes
router.post('/', validate({ body: createDishSchema }), dishesController.createDish);

// GET /api/v1/dishes/:id
router.get('/:id', validate({ params: uuidParamSchema }), dishesController.getDish);

// PUT /api/v1/dishes/:id
router.put(
  '/:id',
  validate({ params: uuidParamSchema, body: updateDishSchema }),
  dishesController.updateDish,
);

// DELETE /api/v1/dishes/:id  (soft delete)
router.delete('/:id', validate({ params: uuidParamSchema }), dishesController.deleteDish);

export default router;
