/**
 * src/modules/auth/auth.controller.ts
 *
 * Controller delgado de autenticación.
 * Recibe el request validado y delega al service.
 */
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import type { LoginInput, RefreshInput, LogoutInput } from './auth.schema';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body as LoginInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refresh(req.body as RefreshInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(req.body as LogoutInput);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
