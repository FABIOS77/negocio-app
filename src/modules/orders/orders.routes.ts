/**
 * src/modules/orders/orders.routes.ts
 *
 * Rutas del módulo de pedidos — todas protegidas con requireAuth.
 *
 * Implementado en Sprint 3:
 *   GET    /api/v1/orders
 *   GET    /api/v1/orders/:id
 *   POST   /api/v1/orders
 *   PATCH  /api/v1/orders/:id/status
 *
 * No implementado (Sprint futuro):
 *   PUT    /api/v1/orders/:id   (edición completa — impacta sync y reportes)
 *   DELETE /api/v1/orders/:id   (no existe en flujo de negocio; usar CANCELLED)
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createOrderSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  uuidParamSchema,
} from './orders.schema';
import * as ordersController from './orders.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/v1/orders?date=YYYY-MM-DD&status=PENDING&page=1&limit=20
router.get('/', validate({ query: orderQuerySchema }), ordersController.listOrders);

// POST /api/v1/orders
router.post('/', validate({ body: createOrderSchema }), ordersController.createOrder);

// GET /api/v1/orders/:id
router.get('/:id', validate({ params: uuidParamSchema }), ordersController.getOrder);

// PATCH /api/v1/orders/:id/status
router.patch(
  '/:id/status',
  validate({ params: uuidParamSchema, body: updateOrderStatusSchema }),
  ordersController.changeStatus,
);

export default router;
