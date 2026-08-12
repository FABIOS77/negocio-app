/**
 * src/modules/users/users.schema.ts
 *
 * Schemas Zod para validación de inputs del módulo de usuarios.
 */
import { z } from 'zod';

/** Patch /users/me — permite cambiar name y/o password */
export const updateMeSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
  })
  .refine(
    (data) => {
      // Si se provee newPassword, se debe proveer currentPassword
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: 'currentPassword is required to change password', path: ['currentPassword'] },
  )
  .refine(
    (data) => {
      // Debe tener al menos un campo
      return data.name !== undefined || data.newPassword !== undefined;
    },
    { message: 'At least one field (name or newPassword) must be provided' },
  );

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
