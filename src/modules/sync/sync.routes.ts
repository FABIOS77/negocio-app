/**
 * src/modules/sync/sync.routes.ts
 *
 * Rutas del módulo de sincronización.
 * Ambas protegidas con requireAuth.
 *
 * Endpoints:
 *   POST /api/v1/sync/push
 *   GET  /api/v1/sync/pull
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { syncRateLimit } from '../../middlewares/rate-limit.middleware';
import { pushRequestSchema, pullQuerySchema } from './sync.schema';
import * as syncController from './sync.controller';

const router = Router();

router.use(requireAuth);

// POST /api/v1/sync/push
router.post('/push', syncRateLimit, validate({ body: pushRequestSchema }), syncController.push);

// GET /api/v1/sync/pull?cursor=0&limit=100&entity_types=order,expense
router.get('/pull', validate({ query: pullQuerySchema }), syncController.pull);

export default router;
