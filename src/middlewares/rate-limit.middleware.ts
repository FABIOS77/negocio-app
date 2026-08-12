/**
 * src/middlewares/rate-limit.middleware.ts
 *
 * Middlewares de rate limiting basados en express-rate-limit.
 *
 * - globalRateLimit: límite general para todas las rutas.
 * - authRateLimit: límite estricto para endpoints de autenticación (/auth/login, etc.)
 *   Previene ataques de fuerza bruta.
 */
import rateLimit from 'express-rate-limit';

const rateLimitErrorBody = {
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
};

const authRateLimitErrorBody = {
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later',
  },
};

/** Límite general: 200 requests / 15 minutos por IP. */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitErrorBody,
});

/** Límite estricto para autenticación: 10 intentos / 15 minutos por IP. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitErrorBody,
});
