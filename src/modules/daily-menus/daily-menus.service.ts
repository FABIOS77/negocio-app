/**
 * src/modules/daily-menus/daily-menus.service.ts
 *
 * Lógica de negocio para la gestión del menú diario.
 *
 * Reglas de negocio:
 * - Un único menú por fecha (UNIQUE en menu_date)
 * - menu_date = fecha de negocio en America/La_Paz
 * - Todos los platos del menú deben existir y estar activos al crear/modificar
 * - No se permiten platos duplicados en el mismo menú (UNIQUE compuesto en BD)
 * - Un menú histórico no se puede modificar retroactivamente de forma destructiva
 * - Las operaciones multi-tabla usan transacciones Sequelize
 */
import { sequelize } from '../../database/sequelize';
import * as menuRepo from './daily-menus.repository';
import * as dishesRepo from '../dishes/dishes.repository';
import * as dishesService from '../dishes/dishes.service';
import { getTodayInLaPaz } from '../../utils/timezone';
import { NotFoundError, ConflictError, BusinessRuleError } from '../../utils/errors';
import { buildPagination } from '../../utils/response';
import type { Dish } from '../dishes/dish.model';
import type { DailyMenu } from './daily-menu.model';
import type {
  CreateDailyMenuInput,
  UpdateDailyMenuInput,
  DailyMenuQueryInput,
  DrawInput,
} from './daily-menus.schema';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface DishInMenuDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  active: boolean;
}

export interface DailyMenuDTO {
  id: string;
  menuDate: string;
  active: boolean;
  version: number;
  dishes: DishInMenuDTO[];
  createdAt: Date;
  updatedAt: Date;
}

function dishToMenuDTO(dish: Dish): DishInMenuDTO {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    price: parseFloat(dish.price),
    imageUrl: dish.imageUrl,
    active: dish.active,
  };
}

function toDTO(menu: DailyMenu): DailyMenuDTO {
  // Sequelize adjunta los platos vía asociación belongsToMany
  const dishes = (menu.get('dishes') as Dish[] | undefined) ?? [];
  return {
    id: menu.id,
    menuDate: menu.menuDate,
    active: menu.active,
    version: menu.version,
    dishes: dishes.map(dishToMenuDTO),
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  };
}

// ─── Validaciones internas ────────────────────────────────────────────────────

/**
 * Valida que todos los dishIds existan, estén activos y no tengan duplicados.
 * Retorna los platos encontrados.
 */
async function validateDishIds(dishIds: string[]): Promise<void> {
  // Duplicados ya validados por Zod; aquí validamos existencia + active
  const found = await dishesRepo.findActiveByIds(dishIds);

  if (found.length !== dishIds.length) {
    const foundIds = new Set(found.map((d) => d.id));
    const missing = dishIds.filter((id) => !foundIds.has(id));
    throw new BusinessRuleError(
      `Some dishes are not found or are not active: ${missing.join(', ')}`,
    );
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listMenus(query: DailyMenuQueryInput) {
  const { count, rows } = await menuRepo.findAll(
    { date: query.date },
    { page: query.page, limit: query.limit },
  );

  return {
    data: rows.map(toDTO),
    pagination: buildPagination(count, query.page, query.limit),
  };
}

export async function getMenu(id: string): Promise<DailyMenuDTO> {
  const menu = await menuRepo.findById(id);
  if (!menu) throw new NotFoundError('DailyMenu');
  return toDTO(menu);
}

export async function getTodayMenu(): Promise<DailyMenuDTO | null> {
  const today = getTodayInLaPaz();
  const menu = await menuRepo.findByDate(today);
  return menu ? toDTO(menu) : null;
}

export async function createMenu(input: CreateDailyMenuInput): Promise<DailyMenuDTO> {
  // Verificar que no exista ya un menú para esa fecha
  const existing = await menuRepo.findByDate(input.menuDate);
  if (existing) {
    throw new ConflictError(`A menu already exists for date ${input.menuDate}`);
  }

  // Validar platos
  await validateDishIds(input.dishIds);

  const menu = await sequelize.transaction(async (t) => {
    return menuRepo.create(
      { menuDate: input.menuDate, active: input.active },
      input.dishIds,
      t,
    );
  });

  // Recargar con dishes incluidos
  const created = await menuRepo.findById(menu.id);
  return toDTO(created!);
}

export async function updateMenu(id: string, input: UpdateDailyMenuInput): Promise<DailyMenuDTO> {
  const menu = await menuRepo.findById(id);
  if (!menu) throw new NotFoundError('DailyMenu');

  // Validar nuevos platos si se envían
  if (input.dishIds !== undefined) {
    await validateDishIds(input.dishIds);
  }

  const updates: { active?: boolean } = {};
  if (input.active !== undefined) updates.active = input.active;

  await sequelize.transaction(async (t) => {
    return menuRepo.update(menu, updates, input.dishIds, t);
  });

  const updated = await menuRepo.findById(id);
  return toDTO(updated!);
}

/**
 * Sorteo de platos activos para el menú.
 * NO crea ni modifica ningún menú. Solo selecciona.
 */
export async function drawDishes(input: DrawInput) {
  return dishesService.drawDishes(input.count);
}
