/**
 * src/modules/daily-menus/daily-menus.schema.ts
 *
 * Schemas Zod para validación de inputs del módulo de menú diario.
 */
import { z } from 'zod';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const dishIdsSchema = z
  .array(z.string().uuid('Each dish_id must be a valid UUID'))
  .min(1, 'At least one dish is required')
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'Duplicate dish IDs are not allowed',
  );

export const createDailyMenuSchema = z.object({
  menuDate: dateSchema,
  dishIds: dishIdsSchema,
  active: z.boolean().optional().default(true),
});

export const updateDailyMenuSchema = z.object({
  dishIds: dishIdsSchema.optional(),
  active: z.boolean().optional(),
});

export const dailyMenuQuerySchema = z.object({
  date: dateSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

export const drawSchema = z.object({
  count: z.number().int().positive('Count must be a positive integer').max(20),
});

export type CreateDailyMenuInput = z.infer<typeof createDailyMenuSchema>;
export type UpdateDailyMenuInput = z.infer<typeof updateDailyMenuSchema>;
export type DailyMenuQueryInput = z.infer<typeof dailyMenuQuerySchema>;
export type DrawInput = z.infer<typeof drawSchema>;
