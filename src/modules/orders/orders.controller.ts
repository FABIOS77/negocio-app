/**
 * src/modules/orders/orders.controller.ts
 *
 * Controller delgado de pedidos.
 * Toda la lógica de negocio está en orders.service.ts.
 */
import type { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service';
import { sendSuccess } from '../../utils/response';
import type { CreateOrderInput, OrderQueryInput, UpdateOrderStatusInput } from './orders.schema';

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ordersService.listOrders(req.query as unknown as OrderQueryInput);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await ordersService.getOrder(req.params['id'] as string);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { order, created } = await ordersService.createOrder(
      req.body as CreateOrderInput,
      userId,
    );
    // 201 si se creó ahora, 200 si era un retry con UUID existente (idempotencia)
    sendSuccess(res, order, created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await ordersService.changeStatus(
      req.params['id'] as string,
      req.body as UpdateOrderStatusInput,
    );
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}
