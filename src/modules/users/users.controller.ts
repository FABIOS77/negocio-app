/**
 * src/modules/users/users.controller.ts
 *
 * Controller delgado de usuarios.
 */
import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';
import type { UpdateMeInput } from './users.schema';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const user = await usersService.getMe(userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const user = await usersService.updateMe(userId, req.body as UpdateMeInput);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
