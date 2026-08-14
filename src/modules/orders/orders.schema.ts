/**
 * src/modules/orders/orders.schema.ts
 *
 * Schemas Zod para validación de inputs del módulo de pedidos.
 * Compatible con Zod v4 (usa strings simples para mensajes de error).
 *
 * Reglas:
 * - El cliente puede enviar un UUID como id (para idempotencia offline).
 * - unit_price NO se acepta del cliente; el backend lo obtiene desde la BD.
 * - quantity debe ser entero > 0.
 * - ordered_at es opcional: si no se envía, el servidor usa la hora actual.
 */
import { z } from 'zod';

// ─── Item de pedido ───────────────────────────────────────────────────────────

const orderItemInputSchema = z.object({
  dish_id: z.string().uuid('dish_id must be a valid UUID'),
  quantity: z
    .number()
    .int('quantity must be an integer')
    .positive('quantity must be greater than 0'),
});

// ─── Crear pedido ─────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  id: z.string().uuid('id must be a valid UUID').optional(),
  customer_name: z.string().min(1, 'customer_name cannot be empty').max(200),
  location_text: z.string().max(300).nullish(),
  payment_method: z.enum(['CASH', 'QR', 'OTHER']),
  ordered_at: z.string().datetime({ offset: true }).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must have at least one item'),
});

// ─── Query de listado ─────────────────────────────────────────────────────────

export const orderQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  status: z.enum(['PENDING', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ─── Cambio de estado ─────────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(['DELIVERED', 'CANCELLED'], {
    error: 'status must be DELIVERED or CANCELLED',
  }),
});

// ─── Edición de pedido ────────────────────────────────────────────────────────

export const updateOrderSchema = z.object({
  customer_name: z.string().min(1, 'customer_name cannot be empty').max(200).optional(),
  location_text: z.string().max(300).nullish(),
  payment_method: z.enum(['CASH', 'QR', 'OTHER']).optional(),
  ordered_at: z.string().datetime({ offset: true }).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must have at least one item').optional(),
});

// ─── Param :id ────────────────────────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

// ─── Query de producción ──────────────────────────────────────────────────────

export const productionQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD and is required'),
});

// ─── Tipos inferidos ──────────────────────────────────────────────────────────

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ProductionQueryInput = z.infer<typeof productionQuerySchema>;
