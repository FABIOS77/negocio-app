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
import { Dish } from '../modules/dishes/dish.model';
import { DailyMenu } from '../modules/daily-menus/daily-menu.model';
import { DailyMenuDish } from '../modules/daily-menus/daily-menu-dish.model';

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

  // DailyMenu >──< Dish  (many-to-many via DailyMenuDish)
  DailyMenu.belongsToMany(Dish, {
    through: DailyMenuDish,
    foreignKey: 'dailyMenuId',
    otherKey: 'dishId',
    as: 'dishes',
  });

  Dish.belongsToMany(DailyMenu, {
    through: DailyMenuDish,
    foreignKey: 'dishId',
    otherKey: 'dailyMenuId',
    as: 'dailyMenus',
  });

  // Directas para queries con include
  DailyMenuDish.belongsTo(DailyMenu, { foreignKey: 'dailyMenuId', as: 'dailyMenu' });
  DailyMenuDish.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });
  DailyMenu.hasMany(DailyMenuDish, { foreignKey: 'dailyMenuId', as: 'dailyMenuDishes' });
}
