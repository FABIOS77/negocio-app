/**
 * src/database/associations.ts
 *
 * Define todas las relaciones entre modelos Sequelize.
 * Se llama UNA SOLA VEZ en el arranque del servidor (server.ts),
 * después de que todos los modelos han sido importados.
 *
 * No agregar lógica de negocio aquí.
 */
import { User } from '../modules/users/user.model';
import { RefreshToken } from '../modules/auth/refresh-token.model';

export function setupAssociations(): void {
  // User ──< RefreshToken (un usuario puede tener múltiples sesiones)
  User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE',
  });

  RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });
}
