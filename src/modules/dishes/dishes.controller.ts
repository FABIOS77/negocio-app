/**
 * src/modules/dishes/dishes.controller.ts
 *
 * Controller delgado de platos.
 */
import type { Request, Response, NextFunction } from 'express';
import * as dishesService from './dishes.service';
import { sendSuccess } from '../../utils/response';
import type { CreateDishInput, UpdateDishInput, DishQueryInput } from './dishes.schema';

export async function listDishes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dishesService.listDishes(req.query as unknown as DishQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dish = await dishesService.getDish(req.params['id'] as string);
    sendSuccess(res, dish);
  } catch (err) {
    next(err);
  }
}

export async function createDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dish = await dishesService.createDish(req.body as CreateDishInput);
    sendSuccess(res, dish, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dish = await dishesService.updateDish(req.params['id'] as string, req.body as UpdateDishInput);
    sendSuccess(res, dish);
  } catch (err) {
    next(err);
  }
}

export async function deleteDish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await dishesService.deleteDish(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function drawDishes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = Number(req.body?.count ?? 2);
    const dishes = await dishesService.drawDishes(count);
    sendSuccess(res, { dishes });
  } catch (err) {
    next(err);
  }
}
