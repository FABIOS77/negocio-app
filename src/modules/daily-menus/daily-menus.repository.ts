/**
 * src/modules/daily-menus/daily-menus.repository.ts
 *
 * Acceso a datos para el módulo de menú diario.
 * Las operaciones que modifican DailyMenu + DailyMenuDish se hacen con transacciones.
 */
import type { Transaction } from 'sequelize';
import { DailyMenu } from './daily-menu.model';
import { DailyMenuDish } from './daily-menu-dish.model';
import { Dish } from '../dishes/dish.model';

export async function findAll(filters: { date?: string }, pagination: { page: number; limit: number }) {
  const where: Record<string, unknown> = {};
  if (filters.date) where['menuDate'] = filters.date;

  const { count, rows } = await DailyMenu.findAndCountAll({
    where,
    include: [{ model: Dish, as: 'dishes', through: { attributes: [] } }],
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit,
    order: [['menu_date', 'DESC']],
    distinct: true,
  });

  return { count, rows };
}

export async function findById(id: string): Promise<DailyMenu | null> {
  return DailyMenu.findByPk(id, {
    include: [{ model: Dish, as: 'dishes', through: { attributes: [] } }],
  });
}

export async function findByDate(date: string): Promise<DailyMenu | null> {
  return DailyMenu.findOne({
    where: { menuDate: date },
    include: [{ model: Dish, as: 'dishes', through: { attributes: [] } }],
  });
}

export async function create(
  data: { menuDate: string; active: boolean },
  dishIds: string[],
  transaction: Transaction,
): Promise<DailyMenu> {
  const menu = await DailyMenu.create(data, { transaction });

  await DailyMenuDish.bulkCreate(
    dishIds.map((dishId) => ({ dailyMenuId: menu.id, dishId })),
    { transaction },
  );

  return menu;
}

export async function update(
  menu: DailyMenu,
  updates: { active?: boolean },
  dishIds: string[] | undefined,
  transaction: Transaction,
): Promise<DailyMenu> {
  if (Object.keys(updates).length > 0) {
    await menu.update({ ...updates, version: menu.version + 1 }, { transaction });
  }

  if (dishIds !== undefined) {
    // Reemplazar los platos del menú
    await DailyMenuDish.destroy({ where: { dailyMenuId: menu.id }, transaction });
    await DailyMenuDish.bulkCreate(
      dishIds.map((dishId) => ({ dailyMenuId: menu.id, dishId })),
      { transaction },
    );
  }

  return menu;
}
