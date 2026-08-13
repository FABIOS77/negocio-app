/**
 * src/modules/reports/reports.schema.ts
 *
 * Schemas Zod para el módulo de reportes financieros y de producción.
 * Compatible con Zod v4.
 */
import { z } from 'zod';

export const reportQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'custom']).optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from must be YYYY-MM-DD')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to must be YYYY-MM-DD')
    .optional(),
});

export const topDishesQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'custom']).optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from must be YYYY-MM-DD')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to must be YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const productionQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD and is required'),
});

export const exportQuerySchema = z
  .object({
    date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from must be YYYY-MM-DD and is required'),
    date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to must be YYYY-MM-DD and is required'),
  })
  .refine((data) => data.date_from <= data.date_to, {
    message: 'date_from must be less than or equal to date_to',
    path: ['date_from'],
  });

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type TopDishesQueryInput = z.infer<typeof topDishesQuerySchema>;
export type ProductionQueryInput = z.infer<typeof productionQuerySchema>;
export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
