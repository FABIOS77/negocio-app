/**
 * src/modules/expenses/expenses.schema.ts
 *
 * Schemas Zod para validación de inputs del módulo de gastos y categorías.
 * Compatible con Zod v4.
 */
import { z } from 'zod';

// ─── Expense Categories ───────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
  active: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

const paymentMethodEnum = z.enum(['CASH', 'QR', 'OTHER']);

export const createExpenseSchema = z.object({
  id: z.string().uuid('id must be a valid UUID').optional(),
  description: z
    .string()
    .min(1, 'description is required')
    .max(500, 'description cannot exceed 500 characters'),
  amount: z
    .number()
    .positive('amount must be greater than 0')
    .multipleOf(0.01, 'amount can have at most 2 decimal places'),
  category_id: z.string().uuid('category_id must be a valid UUID'),
  payment_method: paymentMethodEnum,
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expense_date must be YYYY-MM-DD')
    .optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  amount: z
    .number()
    .positive('amount must be greater than 0')
    .multipleOf(0.01)
    .optional(),
  category_id: z.string().uuid('category_id must be a valid UUID').optional(),
  payment_method: paymentMethodEnum.optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expense_date must be YYYY-MM-DD')
    .optional(),
});

export const expenseQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from must be YYYY-MM-DD')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to must be YYYY-MM-DD')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

// ─── Tipos inferidos ──────────────────────────────────────────────────────────

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
