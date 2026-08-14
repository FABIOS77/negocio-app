/**
 * src/modules/sync/sync.schema.ts
 *
 * Zod schemas para endpoints PUSH y PULL de sincronización.
 * Compatible con Zod v4.
 */
import { z } from 'zod';

export const ALLOWED_SYNC_ENTITIES = [
  'user',
  'dish',
  'daily_menu',
  'order',
  'expense_category',
  'expense',
] as const;

export const SYNC_OPERATIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

export const syncOperationInputSchema = z.object({
  operation_id: z.string().uuid('operation_id must be a valid UUID'),
  entity_type: z.enum(ALLOWED_SYNC_ENTITIES, {
    error: `entity_type must be one of: ${ALLOWED_SYNC_ENTITIES.join(', ')}`,
  }),
  entity_id: z.string().uuid('entity_id must be a valid UUID'),
  operation: z.enum(SYNC_OPERATIONS, {
    error: 'operation must be CREATE, UPDATE or DELETE',
  }),
  payload: z.record(z.string(), z.unknown()),
  client_timestamp: z.coerce.date().transform((d) => d.toISOString()),
  base_version: z.coerce.number().int().nonnegative().optional(),
});

export const pushRequestSchema = z.object({
  operations: z
    .array(syncOperationInputSchema)
    .min(1, 'operations array cannot be empty')
    .max(100, 'batch size cannot exceed 100 operations'),
});

export const pullQuerySchema = z.object({
  cursor: z.coerce.number().int().nonnegative().optional().default(0),
  limit: z.coerce.number().int().positive().max(500).optional().default(100),
  entity_types: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim().toLowerCase()))
    .optional(),
});

export type SyncOperationInput = z.infer<typeof syncOperationInputSchema>;
export type PushRequestInput = z.infer<typeof pushRequestSchema>;
export type PullQueryInput = z.infer<typeof pullQuerySchema>;
