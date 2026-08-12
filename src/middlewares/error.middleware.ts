/**
 * src/middlewares/error.middleware.ts
 *
 * Middleware centralizado de manejo de errores.
 * Debe ser el ÚLTIMO middleware registrado en Express.
 *
 * En producción: nunca exponer stack traces ni mensajes internos.
 * En desarrollo: mostrar detalles para facilitar el debugging.
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { sendError } from '../utils/response';
import { env } from '../config/env';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Error de dominio conocido (ValidationError, NotFoundError, etc.)
  if (err instanceof ValidationError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Error inesperado — loguear siempre
  console.error('[Unhandled Error]', err);

  if (env.NODE_ENV === 'production') {
    // En producción: respuesta genérica sin detalles internos
    sendError(res, 'INTERNAL_ERROR', 'Internal server error', 500);
  } else {
    // En desarrollo: incluir mensaje original para debugging
    const message = err instanceof Error ? err.message : 'Unknown error';
    sendError(res, 'INTERNAL_ERROR', message, 500);
  }
}
