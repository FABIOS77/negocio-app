/**
 * src/modules/auth/auth.routes.ts
 *
 * Rutas de autenticación — sin requireAuth (son públicas).
 * Se usa authRateLimit para prevenir fuerza bruta en login.
 */
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimit } from '../../middlewares/rate-limit.middleware';
import { loginSchema, refreshSchema, logoutSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', authRateLimit, validate({ body: loginSchema }), authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', validate({ body: logoutSchema }), authController.logout);

export default router;
