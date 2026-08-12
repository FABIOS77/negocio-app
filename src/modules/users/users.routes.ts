/**
 * src/modules/users/users.routes.ts
 *
 * Rutas de /users/me — protegidas con requireAuth.
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateMeSchema } from './users.schema';
import * as usersController from './users.controller';

const router = Router();

// GET /api/v1/users/me
router.get('/me', requireAuth, usersController.getMe);

// PATCH /api/v1/users/me
router.patch('/me', requireAuth, validate({ body: updateMeSchema }), usersController.updateMe);

export default router;
