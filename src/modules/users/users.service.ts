/**
 * src/modules/users/users.service.ts
 *
 * Lógica de negocio del perfil del usuario autenticado.
 *
 * Reglas:
 * - Nunca devolver password_hash.
 * - El cambio de password se delega a auth.service para centralizar
 *   el hash Argon2id y la revocación de tokens.
 */
import * as usersRepo from './users.repository';
import * as authService from '../auth/auth.service';
import { NotFoundError } from '../../utils/errors';
import type { UpdateMeInput } from './users.schema';

/** Proyección segura del usuario (sin password_hash). */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date;
}

function toDTO(user: Awaited<ReturnType<typeof usersRepo.findById>>): UserDTO {
  if (!user) throw new NotFoundError('User');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt,
  };
}

export async function getMe(userId: string): Promise<UserDTO> {
  const user = await usersRepo.findById(userId);
  return toDTO(user);
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<UserDTO> {
  const user = await usersRepo.findById(userId);
  if (!user) throw new NotFoundError('User');

  // Cambio de contraseña (delega a auth.service para Argon2id + revocación)
  if (input.newPassword && input.currentPassword) {
    await authService.changePassword(userId, input.currentPassword, input.newPassword);
    // Recargar el usuario porque changePassword actualizó passwordHash
    const updated = await usersRepo.findById(userId);
    return toDTO(updated);
  }

  // Cambio de nombre
  if (input.name !== undefined) {
    await usersRepo.updateUser(user, { name: input.name, version: user.version + 1 });
  }

  const updated = await usersRepo.findById(userId);
  return toDTO(updated);
}
