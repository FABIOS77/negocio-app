/**
 * src/middlewares/auth.middleware.ts
 *
 * Middleware requireAuth: valida el JWT Bearer y adjunta req.user al request.
 *
 * Reglas:
 * - Extrae el token de Authorization: Bearer <token>
 * - Verifica firma y expiración con JWT_ACCESS_SECRET
 * - Adjunta { id } al request (payload mínimo — el service puede hidratar si necesita más)
 * - No consulta la BD: el JWT es stateless para el access token
 * - No confiar en datos enviados por el cliente para identificar al usuario
 *
 * Uso:
 *   router.get('/users/me', requireAuth, usersController.getMe)
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError } from '../utils/errors';

export interface AuthPayload {
  sub: string; // userId
}

// Extiende el tipo Request de Express para incluir req.user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AuthenticationError('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7); // quita "Bearer "

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;

    if (!decoded.sub) {
      next(new AuthenticationError('Invalid token payload'));
      return;
    }

    req.user = { sub: decoded.sub };
    next();
  } catch (err) {
    // Verificar por name en lugar de instanceof para compatibilidad con mocks en tests
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new AuthenticationError('Access token expired'));
    } else {
      next(new AuthenticationError('Invalid access token'));
    }
  }
}
