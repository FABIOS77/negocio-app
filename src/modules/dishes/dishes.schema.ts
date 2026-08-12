/**
 * src/modules/dishes/dishes.schema.ts
 *
 * Schemas Zod para validación de inputs del módulo de platos.
 */
import { z } from 'zod';

/** Schema base de precio: debe ser > 0, máximo 2 decimales, en BOB. */
const priceSchema = z
  .number()
  .positive('Price must be greater than 0')
  .multipleOf(0.01, 'Price can have at most 2 decimal places');

export const createDishSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullish(),
  price: priceSchema,
  imageUrl: z.string().url('Invalid URL').max(500).nullish(),
  active: z.boolean().optional().default(true),
});

export const updateDishSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  price: priceSchema.optional(),
  imageUrl: z.string().url('Invalid URL').max(500).nullish(),
  active: z.boolean().optional(),
});

export const dishQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

export type CreateDishInput = z.infer<typeof createDishSchema>;
export type UpdateDishInput = z.infer<typeof updateDishSchema>;
export type DishQueryInput = z.infer<typeof dishQuerySchema>;
