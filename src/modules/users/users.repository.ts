/**
 * src/modules/users/users.repository.ts
 *
 * Acceso a datos para el módulo de usuarios.
 * Única capa que toca el modelo User directamente.
 */
import { User } from './user.model';
import type { UserAttributes } from './user.model';

export async function findById(id: string): Promise<User | null> {
  return User.findByPk(id);
}

export async function findByEmail(email: string): Promise<User | null> {
  return User.findOne({ where: { email } });
}

export async function updateUser(
  user: User,
  updates: Partial<Pick<UserAttributes, 'name' | 'passwordHash' | 'version'>>,
): Promise<User> {
  return user.update(updates);
}
