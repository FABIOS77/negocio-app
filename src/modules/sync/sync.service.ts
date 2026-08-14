/**
 * src/modules/sync/sync.service.ts
 *
 * Motor de sincronización bidireccional (PUSH / PULL).
 *
 * Principios:
 * - Atomicidad: Entidad + Version + ChangeLog + SyncOperation dentro de una única transacción por operación.
 * - Idempotencia: Verificación previa por `operation_id`. Si ya fue procesada, se devuelve el resultado anterior.
 * - Concurrencia optimista: Verificación de `base_version` vs `version` del servidor. Si difieren -> CONFLICT.
 * - Seguridad: `users` no permite CREATE offline.
 * - PULL por Cursor: `server_change_id` mono-incremental de `change_log`.
 */
import { sequelize } from '../../database/sequelize';
import * as syncRepo from './sync.repository';
import { Dish } from '../dishes/dish.model';
import { Order } from '../orders/order.model';
import { DailyMenu } from '../daily-menus/daily-menu.model';
import { DailyMenuDish } from '../daily-menus/daily-menu-dish.model';
import { ExpenseCategory } from '../expenses/expense-category.model';
import { Expense } from '../expenses/expense.model';
import * as ordersService from '../orders/orders.service';
import * as expensesService from '../expenses/expenses.service';
import { NotFoundError } from '../../utils/errors';

import type { PushRequestInput, PullQueryInput, SyncOperationInput } from './sync.schema';
import type { SyncOpType, SyncStatus } from './sync-operation.model';

export interface OperationResultDTO {
  operation_id: string;
  status: SyncStatus;
  server_version?: number | null;
  server_change_id?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any> | null;
}

export interface ChangeLogDTO {
  server_change_id: number;
  entity_type: string;
  entity_id: string;
  operation: SyncOpType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  version: number;
  created_at: Date;
}

export interface PullResponseDTO {
  changes: ChangeLogDTO[];
  next_cursor: number;
  has_more: boolean;
}

// ─── Auxiliary Helpers & Sanitization ─────────────────────────────────────────

function sanitizeDishPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  if (payload.name !== undefined) sanitized.name = payload.name;
  if (payload.description !== undefined) sanitized.description = payload.description ?? null;
  if (payload.price !== undefined) sanitized.price = payload.price;
  if (payload.imageUrl !== undefined || payload.image_url !== undefined) {
    sanitized.imageUrl = payload.imageUrl ?? payload.image_url ?? null;
  }
  if (payload.active !== undefined) sanitized.active = payload.active;
  return sanitized;
}

function sanitizeOrderPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const customerName = payload.customer_name ?? payload.customerName;
  if (customerName !== undefined) sanitized.customer_name = customerName;

  const locationText = payload.location_text ?? payload.locationText;
  if (locationText !== undefined) sanitized.location_text = locationText ?? null;

  const paymentMethod = payload.payment_method ?? payload.paymentMethod;
  if (paymentMethod !== undefined) sanitized.payment_method = paymentMethod;

  const orderedAt = payload.ordered_at ?? payload.orderedAt;
  if (orderedAt !== undefined) sanitized.ordered_at = orderedAt;

  const rawItems = payload.items;
  if (Array.isArray(rawItems)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sanitized.items = rawItems.map((item: any) => ({
      dish_id: item.dish_id ?? item.dishId,
      quantity: item.quantity,
    }));
  }

  const status = payload.status;
  if (status !== undefined) sanitized.status = status;

  return sanitized;
}

function sanitizeExpensePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  if (payload.description !== undefined) sanitized.description = payload.description;
  if (payload.amount !== undefined) sanitized.amount = payload.amount;

  const categoryId = payload.category_id ?? payload.categoryId;
  if (categoryId !== undefined) sanitized.category_id = categoryId;

  const paymentMethod = payload.payment_method ?? payload.paymentMethod;
  if (paymentMethod !== undefined) sanitized.payment_method = paymentMethod;

  const expenseDate = payload.expense_date ?? payload.expenseDate;
  if (expenseDate !== undefined) sanitized.expense_date = expenseDate;

  return sanitized;
}

function sanitizeExpenseCategoryPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  if (payload.name !== undefined) sanitized.name = payload.name;
  if (payload.description !== undefined) sanitized.description = payload.description ?? null;
  if (payload.active !== undefined) sanitized.active = payload.active;
  return sanitized;
}

function sanitizePayload(entityType: string, payload: Record<string, unknown>): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  switch (entityType) {
    case 'dish':
      return sanitizeDishPayload(payload);
    case 'order':
      return sanitizeOrderPayload(payload);
    case 'expense':
      return sanitizeExpensePayload(payload);
    case 'expense_category':
      return sanitizeExpenseCategoryPayload(payload);
    default:
      return payload;
  }
}

/**
 * Obtiene el snapshot actual de cualquier entidad sincronizable.
 */
async function fetchEntitySnapshot(
  entityType: string,
  entityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ entity: any; version: number } | null> {
  switch (entityType) {
    case 'dish': {
      const d = await Dish.findByPk(entityId, { paranoid: false });
      return d ? { entity: d.toJSON(), version: d.version } : null;
    }
    case 'daily_menu': {
      const m = await DailyMenu.findByPk(entityId, {
        include: [{ model: Dish, as: 'dishes', through: { attributes: [] } }],
      });
      return m ? { entity: m.toJSON(), version: m.version } : null;
    }
    case 'order': {
      const o = await ordersService.getOrder(entityId).catch(() => null);
      return o ? { entity: o, version: o.version } : null;
    }
    case 'expense_category': {
      const c = await ExpenseCategory.findByPk(entityId);
      return c ? { entity: c.toJSON(), version: c.version } : null;
    }
    case 'expense': {
      const e = await expensesService.getExpense(entityId).catch(() => null);
      return e ? { entity: e, version: e.version } : null;
    }
    default:
      return null;
  }
}

// ─── Single Operation Handler ─────────────────────────────────────────────────

async function processSingleOperation(
  op: SyncOperationInput,
  userId: string,
): Promise<OperationResultDTO> {
  // 1. Idempotencia: Verificar si operation_id ya existe en sync_operations
  const existingOp = await syncRepo.findSyncOperation(op.operation_id);
  if (existingOp) {
    return {
      operation_id: op.operation_id,
      status: 'DUPLICATE',
      server_version: existingOp.serverVersion,
      server_change_id: existingOp.serverChangeId ? parseInt(existingOp.serverChangeId, 10) : null,
      data: existingOp.resultData,
    };
  }

  // 2. Seguridad: no permitir CREATE offline de usuarios
  if (op.entity_type === 'user' && op.operation === 'CREATE') {
    const errorResult: OperationResultDTO = {
      operation_id: op.operation_id,
      status: 'FAILED',
      error_code: 'USER_OFFLINE_CREATE_FORBIDDEN',
      error_message: 'Creating users offline is forbidden',
    };
    await syncRepo.recordSyncOperation({
      operationId: op.operation_id,
      entityType: op.entity_type,
      entityId: op.entity_id,
      operation: op.operation,
      payload: op.payload,
      clientTimestamp: new Date(op.client_timestamp),
      baseVersion: op.base_version ?? null,
      status: 'FAILED',
      errorCode: errorResult.error_code,
      errorMessage: errorResult.error_message,
      processedBy: userId,
      processedAt: new Date(),
    });
    return errorResult;
  }

  // 3. Ejecutar dentro de una transacción por operación
  try {
    const result = await sequelize.transaction(async (t) => {
      let effectiveOp = op.operation;

      // ─── Control de Concurrencia Optimista para UPDATE y DELETE ───────────────
      if (op.operation === 'UPDATE' || op.operation === 'DELETE') {
        const current = await fetchEntitySnapshot(op.entity_type, op.entity_id);

        if (!current) {
          if (op.operation === 'DELETE') {
            // IDEMPOTENT DELETE: La entidad no existe en el servidor.
            // El objetivo de DELETE ya está cumplido. Retornar PROCESSED.
            const nowIso = new Date().toISOString();
            const resultingData = { id: op.entity_id, deleted: true, deleted_at: nowIso };
            const resultingVersion = (op.base_version ?? 1) + 1;

            const changeEntry = await syncRepo.recordChangeLog(
              {
                entityType: op.entity_type,
                entityId: op.entity_id,
                operation: 'DELETE',
                snapshot: resultingData,
                version: resultingVersion,
              },
              t,
            );

            const serverChangeId = parseInt(changeEntry.serverChangeId, 10);

            await syncRepo.recordSyncOperation(
              {
                operationId: op.operation_id,
                entityType: op.entity_type,
                entityId: op.entity_id,
                operation: op.operation,
                payload: op.payload,
                clientTimestamp: new Date(op.client_timestamp),
                baseVersion: op.base_version ?? null,
                status: 'PROCESSED',
                serverVersion: resultingVersion,
                serverChangeId: changeEntry.serverChangeId,
                resultData: resultingData,
                processedBy: userId,
                processedAt: new Date(),
              },
              t,
            );

            return {
              operation_id: op.operation_id,
              status: 'PROCESSED' as SyncStatus,
              server_version: resultingVersion,
              server_change_id: serverChangeId,
              data: resultingData,
            };
          } else if (op.operation === 'UPDATE') {
            // UPSERT FALLBACK: La entidad no existe en el servidor para UPDATE.
            // Redirigir la ejecución al flujo de CREATE.
            effectiveOp = 'CREATE';
          }
        } else {
          const expectedVersion = op.base_version ?? 0;
          if (current.version !== expectedVersion) {
            // CONFLICT: versión del cliente desactualizada
            const conflictData = current.entity;
            await syncRepo.recordSyncOperation(
              {
                operationId: op.operation_id,
                entityType: op.entity_type,
                entityId: op.entity_id,
                operation: op.operation,
                payload: op.payload,
                clientTimestamp: new Date(op.client_timestamp),
                baseVersion: op.base_version ?? null,
                status: 'CONFLICT',
                serverVersion: current.version,
                resultData: { conflict: true, server_version: current.version, server_data: conflictData },
                processedBy: userId,
                processedAt: new Date(),
              },
              t,
            );

            return {
              operation_id: op.operation_id,
              status: 'CONFLICT' as SyncStatus,
              server_version: current.version,
              data: { conflict: true, server_version: current.version, server_data: conflictData },
            };
          }
        }
      }

      // ─── Ejecutar Operación de Dominio ───────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resultingData: Record<string, any> = {};
      let resultingVersion = 1;
      const cleanPayload = sanitizePayload(op.entity_type, op.payload);

      switch (op.entity_type) {
        case 'order': {
          if (effectiveOp === 'CREATE') {
            const { order } = await ordersService.createOrder(
              {
                id: op.entity_id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(cleanPayload as any),
              },
              userId,
            );
            resultingData = order;
            resultingVersion = order.version;
          } else if (effectiveOp === 'UPDATE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statusPayload = (cleanPayload as any).status;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (statusPayload && !(cleanPayload as any).items && !(cleanPayload as any).customer_name) {
              try {
                const updated = await ordersService.changeStatus(op.entity_id, { status: statusPayload });
                resultingData = updated;
                resultingVersion = updated.version;
              } catch (err) {
                if (err instanceof NotFoundError || (err as Error).name === 'NotFoundError') {
                  const { order } = await ordersService.createOrder(
                    {
                      id: op.entity_id,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ...(cleanPayload as any),
                    },
                    userId,
                  );
                  resultingData = order;
                  resultingVersion = order.version;
                } else {
                  throw err;
                }
              }
            } else {
              try {
                const updated = await ordersService.updateOrder(
                  op.entity_id,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  cleanPayload as any,
                );
                resultingData = updated;
                resultingVersion = updated.version;
              } catch (err) {
                if (err instanceof NotFoundError || (err as Error).name === 'NotFoundError') {
                  const { order } = await ordersService.createOrder(
                    {
                      id: op.entity_id,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ...(cleanPayload as any),
                    },
                    userId,
                  );
                  resultingData = order;
                  resultingVersion = order.version;
                } else {
                  throw err;
                }
              }
            }
          } else if (effectiveOp === 'DELETE') {
            try {
              await ordersService.deleteOrder(op.entity_id);
              const deletedOrder = await Order.findByPk(op.entity_id, { paranoid: false, transaction: t });
              resultingData = {
                ...(deletedOrder ? deletedOrder.toJSON() : {}),
                id: op.entity_id,
                deleted: true,
                deleted_at: deletedOrder?.deletedAt?.toISOString() ?? new Date().toISOString(),
              };
              resultingVersion = (deletedOrder?.version ?? (op.base_version ?? 1)) + 1;
            } catch (err) {
              if (err instanceof NotFoundError || (err as Error).name === 'NotFoundError') {
                resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
                resultingVersion = (op.base_version ?? 1) + 1;
              } else {
                throw err;
              }
            }
          }
          break;
        }

        case 'expense': {
          if (effectiveOp === 'CREATE') {
            const { expense } = await expensesService.createExpense(
              {
                id: op.entity_id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(cleanPayload as any),
              },
              userId,
            );
            resultingData = expense;
            resultingVersion = expense.version;
          } else if (effectiveOp === 'UPDATE') {
            try {
              const updated = await expensesService.updateExpense(
                op.entity_id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                cleanPayload as any,
              );
              resultingData = updated;
              resultingVersion = updated.version;
            } catch (err) {
              if (err instanceof NotFoundError || (err as Error).name === 'NotFoundError') {
                const { expense } = await expensesService.createExpense(
                  {
                    id: op.entity_id,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(cleanPayload as any),
                  },
                  userId,
                );
                resultingData = expense;
                resultingVersion = expense.version;
              } else {
                throw err;
              }
            }
          } else if (effectiveOp === 'DELETE') {
            try {
              await expensesService.deleteExpense(op.entity_id);
              const deletedExp = await Expense.findByPk(op.entity_id, { paranoid: false, transaction: t });
              resultingData = {
                ...(deletedExp ? deletedExp.toJSON() : {}),
                id: op.entity_id,
                deleted: true,
                deleted_at: deletedExp?.deletedAt?.toISOString() ?? new Date().toISOString(),
              };
              resultingVersion = (deletedExp?.version ?? (op.base_version ?? 1)) + 1;
            } catch (err) {
              if (err instanceof NotFoundError || (err as Error).name === 'NotFoundError') {
                resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
                resultingVersion = (op.base_version ?? 1) + 1;
              } else {
                throw err;
              }
            }
          }
          break;
        }

        case 'dish': {
          if (effectiveOp === 'CREATE') {
            const existingDish = await Dish.findByPk(op.entity_id, { transaction: t, paranoid: false });
            if (existingDish) {
              await existingDish.update({ ...cleanPayload, deletedAt: null, version: existingDish.version + 1 }, { transaction: t });
              resultingData = existingDish.toJSON();
              resultingVersion = existingDish.version;
            } else {
              const dish = await Dish.create(
                {
                  id: op.entity_id,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(cleanPayload as any),
                },
                { transaction: t },
              );
              resultingData = dish.toJSON();
              resultingVersion = dish.version;
            }
          } else if (effectiveOp === 'UPDATE') {
            const dish = await Dish.findByPk(op.entity_id, { transaction: t });
            if (!dish) {
              const newDish = await Dish.create(
                {
                  id: op.entity_id,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(cleanPayload as any),
                },
                { transaction: t },
              );
              resultingData = newDish.toJSON();
              resultingVersion = newDish.version;
            } else {
              await dish.update({ ...cleanPayload, version: dish.version + 1 }, { transaction: t });
              resultingData = dish.toJSON();
              resultingVersion = dish.version;
            }
          } else if (effectiveOp === 'DELETE') {
            const dish = await Dish.findByPk(op.entity_id, { transaction: t });
            if (dish) {
              await dish.destroy({ transaction: t });
              await dish.update({ version: dish.version + 1 }, { transaction: t });
              resultingData = {
                ...dish.toJSON(),
                deleted: true,
                deleted_at: dish.deletedAt?.toISOString() ?? new Date().toISOString(),
              };
              resultingVersion = dish.version;
            } else {
              resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
              resultingVersion = (op.base_version ?? 1) + 1;
            }
          }
          break;
        }

        case 'daily_menu': {
          if (effectiveOp === 'CREATE' || effectiveOp === 'UPDATE') {
            const menuDate = (op.payload as { menuDate?: string; menu_date?: string }).menuDate ??
              (op.payload as { menu_date?: string }).menu_date ?? '2026-08-12';
            const dishIds = (op.payload as { dishIds?: string[]; dish_ids?: string[] }).dishIds ??
              (op.payload as { dish_ids?: string[] }).dish_ids ?? [];

            let menu = await DailyMenu.findByPk(op.entity_id, { transaction: t });
            if (!menu) {
              menu = await DailyMenu.create(
                { id: op.entity_id, menuDate, active: true, version: 1 },
                { transaction: t },
              );
            } else {
              await menu.update({ menuDate, version: menu.version + 1 }, { transaction: t });
            }

            // Actualizar platos del menú diario
            await DailyMenuDish.destroy({ where: { dailyMenuId: menu.id }, transaction: t });
            if (dishIds.length > 0) {
              await DailyMenuDish.bulkCreate(
                dishIds.map((dishId: string) => ({ dailyMenuId: menu.id, dishId })),
                { transaction: t },
              );
            }

            const reloadedMenu = await DailyMenu.findByPk(menu.id, {
              include: [{ model: Dish, as: 'dishes', through: { attributes: [] } }],
              transaction: t,
            });
            resultingData = reloadedMenu!.toJSON();
            resultingVersion = menu.version;
          } else if (effectiveOp === 'DELETE') {
            const menu = await DailyMenu.findByPk(op.entity_id, { transaction: t });
            if (menu) {
              await DailyMenuDish.destroy({ where: { dailyMenuId: menu.id }, transaction: t });
              await menu.destroy({ transaction: t });
              resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
              resultingVersion = menu.version + 1;
            } else {
              resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
              resultingVersion = (op.base_version ?? 1) + 1;
            }
          }
          break;
        }

        case 'expense_category': {
          if (effectiveOp === 'CREATE') {
            const existingCat = await ExpenseCategory.findByPk(op.entity_id, { transaction: t });
            if (existingCat) {
              resultingData = existingCat.toJSON();
              resultingVersion = existingCat.version;
            } else {
              const cat = await ExpenseCategory.create(
                {
                  id: op.entity_id,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(cleanPayload as any),
                },
                { transaction: t },
              );
              resultingData = cat.toJSON();
              resultingVersion = cat.version;
            }
          } else if (effectiveOp === 'UPDATE') {
            const cat = await ExpenseCategory.findByPk(op.entity_id, { transaction: t });
            if (!cat) {
              const newCat = await ExpenseCategory.create(
                {
                  id: op.entity_id,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(cleanPayload as any),
                },
                { transaction: t },
              );
              resultingData = newCat.toJSON();
              resultingVersion = newCat.version;
            } else {
              await cat.update({ ...cleanPayload, version: cat.version + 1 }, { transaction: t });
              resultingData = cat.toJSON();
              resultingVersion = cat.version;
            }
          } else if (effectiveOp === 'DELETE') {
            const cat = await ExpenseCategory.findByPk(op.entity_id, { transaction: t });
            if (cat) {
              const expCount = await Expense.count({ where: { categoryId: cat.id }, paranoid: false, transaction: t });
              if (expCount > 0) {
                await cat.update({ active: false, version: cat.version + 1 }, { transaction: t });
                resultingData = { ...cat.toJSON(), active: false, deleted: true, deleted_at: new Date().toISOString() };
              } else {
                await cat.destroy({ transaction: t });
                resultingData = { ...cat.toJSON(), deleted: true, deleted_at: new Date().toISOString() };
              }
              resultingVersion = cat.version;
            } else {
              resultingData = { id: op.entity_id, deleted: true, deleted_at: new Date().toISOString() };
              resultingVersion = (op.base_version ?? 1) + 1;
            }
          }
          break;
        }
      }

      // ─── Registrar entrada en change_log (asigna server_change_id) ────────────
      const changeEntry = await syncRepo.recordChangeLog(
        {
          entityType: op.entity_type,
          entityId: op.entity_id,
          operation: op.operation,
          snapshot: resultingData,
          version: resultingVersion,
        },
        t,
      );

      const serverChangeId = parseInt(changeEntry.serverChangeId, 10);

      // ─── Registrar sync_operation (status: PROCESSED) ────────────────────────
      await syncRepo.recordSyncOperation(
        {
          operationId: op.operation_id,
          entityType: op.entity_type,
          entityId: op.entity_id,
          operation: op.operation,
          payload: op.payload,
          clientTimestamp: new Date(op.client_timestamp),
          baseVersion: op.base_version ?? null,
          status: 'PROCESSED',
          serverVersion: resultingVersion,
          serverChangeId: changeEntry.serverChangeId,
          resultData: resultingData,
          processedBy: userId,
          processedAt: new Date(),
        },
        t,
      );

      return {
        operation_id: op.operation_id,
        status: 'PROCESSED' as SyncStatus,
        server_version: resultingVersion,
        server_change_id: serverChangeId,
        data: resultingData,
      };
    });

    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Processing error';
    await syncRepo.recordSyncOperation({
      operationId: op.operation_id,
      entityType: op.entity_type,
      entityId: op.entity_id,
      operation: op.operation,
      payload: op.payload,
      clientTimestamp: new Date(op.client_timestamp),
      baseVersion: op.base_version ?? null,
      status: 'FAILED',
      errorCode: 'SYNC_PROCESSING_ERROR',
      errorMessage: errorMsg,
      processedBy: userId,
      processedAt: new Date(),
    });

    return {
      operation_id: op.operation_id,
      status: 'FAILED',
      error_code: 'SYNC_PROCESSING_ERROR',
      error_message: errorMsg,
    };
  }
}

// ─── Public Services ──────────────────────────────────────────────────────────

export async function processPush(
  input: PushRequestInput,
  userId: string,
): Promise<{ processed: number; failed: number; results: OperationResultDTO[] }> {
  const results: OperationResultDTO[] = [];
  let processed = 0;
  let failed = 0;

  for (const op of input.operations) {
    const res = await processSingleOperation(op, userId);
    results.push(res);
    if (res.status === 'PROCESSED' || res.status === 'DUPLICATE') {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed, results };
}

export async function processPull(query: PullQueryInput): Promise<PullResponseDTO> {
  const cursorNum = typeof query.cursor === 'string' ? parseInt(query.cursor, 10) : (query.cursor ?? 0);
  const limitNum = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (query.limit ?? 100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawEntityTypes = (query as any).entity_types;
  const entityTypesArr = typeof rawEntityTypes === 'string'
    ? rawEntityTypes.split(',').map((s: string) => s.trim().toLowerCase())
    : Array.isArray(rawEntityTypes) ? rawEntityTypes : undefined;

  const { changes, nextCursor, hasMore } = await syncRepo.getChanges({
    cursor: isNaN(cursorNum) ? 0 : cursorNum,
    limit: isNaN(limitNum) ? 100 : limitNum,
    entityTypes: entityTypesArr,
  });

  const formattedChanges: ChangeLogDTO[] = changes.map((c) => ({
    server_change_id: parseInt(c.serverChangeId, 10),
    entity_type: c.entityType,
    entity_id: c.entityId,
    operation: c.operation,
    data: c.snapshot,
    version: c.version,
    created_at: c.createdAt!,
  }));

  return {
    changes: formattedChanges,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}
