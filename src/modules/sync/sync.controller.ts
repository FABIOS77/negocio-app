/**
 * src/modules/sync/sync.controller.ts
 *
 * Controller de sincronización REST.
 */
import type { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service';
import { sendSuccess } from '../../utils/response';
import type { PushRequestInput, PullQueryInput } from './sync.schema';

export async function push(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const result = await syncService.processPush(req.body as PushRequestInput, userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function pull(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await syncService.processPull(req.query as unknown as PullQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
