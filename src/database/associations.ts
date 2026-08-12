/**
 * src/database/associations.ts
 *
 * Define todas las relaciones entre modelos Sequelize.
 * Se llama UNA SOLA VEZ en el arranque del servidor (server.ts),
 * después de que todos los modelos han sido importados.
 */
import { User } from '../modules/users/user.model';
import { RefreshToken } from '../modules/auth/refresh-token.model';
import { Dish } from '../modules/dishes/dish.model';
import { DailyMenu } from '../modules/daily-menus/daily-menu.model';
import { DailyMenuDish } from '../modules/daily-menus/daily-menu-dish.model';
import { Order } from '../modules/orders/order.model';
import { OrderItem } from '../modules/orders/order-item.model';
import { ExpenseCategory } from '../modules/expenses/expense-category.model';
import { Expense } from '../modules/expenses/expense.model';
import { SyncOperation } from '../modules/sync/sync-operation.model';

export function setupAssociations(): void {
  // User ──< RefreshToken
  User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE',
  });

  RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // DailyMenu >──< Dish (via DailyMenuDish)
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

  DailyMenuDish.belongsTo(DailyMenu, { foreignKey: 'dailyMenuId', as: 'dailyMenu' });
  DailyMenuDish.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });
  DailyMenu.hasMany(DailyMenuDish, { foreignKey: 'dailyMenuId', as: 'dailyMenuDishes' });

  // User ──< Order
  User.hasMany(Order, {
    foreignKey: 'createdBy',
    as: 'orders',
  });

  Order.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  // Order ──< OrderItem
  Order.hasMany(OrderItem, {
    foreignKey: 'orderId',
    as: 'items',
    onDelete: 'CASCADE',
  });

  OrderItem.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'order',
  });

  // OrderItem ──> Dish
  OrderItem.belongsTo(Dish, {
    foreignKey: 'dishId',
    as: 'dish',
  });

  Dish.hasMany(OrderItem, {
    foreignKey: 'dishId',
    as: 'orderItems',
  });

  // ExpenseCategory ──< Expense
  ExpenseCategory.hasMany(Expense, {
    foreignKey: 'categoryId',
    as: 'expenses',
  });

  Expense.belongsTo(ExpenseCategory, {
    foreignKey: 'categoryId',
    as: 'category',
  });

  // User ──< Expense
  User.hasMany(Expense, {
    foreignKey: 'createdBy',
    as: 'expenses',
  });

  Expense.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  // User ──< SyncOperation
  User.hasMany(SyncOperation, {
    foreignKey: 'processedBy',
    as: 'syncOperations',
  });

  SyncOperation.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processor',
  });
}
