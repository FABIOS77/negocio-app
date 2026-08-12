/**
 * src/modules/daily-menus/daily-menus.controller.ts
 *
 * Controller delgado de menú diario.
 */
import type { Request, Response, NextFunction } from 'express';
import * as menusService from './daily-menus.service';
import { sendSuccess } from '../../utils/response';
import type {
  CreateDailyMenuInput,
  UpdateDailyMenuInput,
  DailyMenuQueryInput,
  DrawInput,
} from './daily-menus.schema';

export async function listMenus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await menusService.listMenus(req.query as unknown as DailyMenuQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const menu = await menusService.getMenu(req.params['id'] as string);
    sendSuccess(res, menu);
  } catch (err) {
    next(err);
  }
}

export async function getTodayMenu(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const menu = await menusService.getTodayMenu();
    // Si no hay menú para hoy, retornar null en data (no 404)
    sendSuccess(res, menu);
  } catch (err) {
    next(err);
  }
}

export async function createMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const menu = await menusService.createMenu(req.body as CreateDailyMenuInput);
    sendSuccess(res, menu, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const menu = await menusService.updateMenu(
      req.params['id'] as string,
      req.body as UpdateDailyMenuInput,
    );
    sendSuccess(res, menu);
  } catch (err) {
    next(err);
  }
}

export async function drawDishes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dishes = await menusService.drawDishes(req.body as DrawInput);
    sendSuccess(res, { dishes });
  } catch (err) {
    next(err);
  }
}
