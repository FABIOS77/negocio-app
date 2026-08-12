/**
 * src/modules/dishes/dishes.repository.ts
 *
 * Acceso a datos para el módulo de platos.
 * Única capa que toca el modelo Dish directamente.
 */
import { Op, type WhereOptions } from 'sequelize';
import { Dish, type DishCreationAttributes } from './dish.model';
import type { DishAttributes } from './dish.model';

export interface DishFilters {
  active?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export async function findAll(filters: DishFilters, pagination: PaginationOptions) {
  const where: WhereOptions<DishAttributes> = {};
  if (filters.active !== undefined) {
    where['active'] = filters.active;
  }

  const { count, rows } = await Dish.findAndCountAll({
    where,
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit,
    order: [['name', 'ASC']],
  });

  return { count, rows };
}

export async function findById(id: string): Promise<Dish | null> {
  return Dish.findByPk(id);
}

export async function findByName(name: string): Promise<Dish | null> {
  return Dish.findOne({ where: { name } });
}

export async function findActiveByIds(ids: string[]): Promise<Dish[]> {
  return Dish.findAll({
    where: {
      id: { [Op.in]: ids },
      active: true,
    },
  });
}

export async function findAllActive(): Promise<Dish[]> {
  return Dish.findAll({ where: { active: true }, order: [['name', 'ASC']] });
}

export async function create(data: DishCreationAttributes): Promise<Dish> {
  return Dish.create(data);
}

export async function update(
  dish: Dish,
  updates: Partial<Pick<DishAttributes, 'name' | 'description' | 'price' | 'imageUrl' | 'active' | 'version'>>,
): Promise<Dish> {
  return dish.update(updates);
}

/** Soft delete: paranoid: true — Sequelize setea deleted_at */
export async function softDelete(dish: Dish): Promise<void> {
  await dish.destroy();
}
