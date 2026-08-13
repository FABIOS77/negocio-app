/**
 * src/modules/dishes/dishes.service.ts
 *
 * Lógica de negocio para la gestión de platos.
 *
 * Reglas de negocio:
 * - price > 0 (validado por Zod, también enforceado por CHECK en BD)
 * - No almacenar float/double; DECIMAL(10,2) en BD
 * - Los nombres duplicados están permitidos a nivel de BD (sin UNIQUE constraint),
 *   pero el servicio emite un warning / podría en el futuro agregar la restricción.
 *   Por ahora: sin restricción de nombre único (la arquitectura no lo especificó explícitamente).
 * - DELETE = soft delete; el plato no aparece en queries normales
 * - Un plato eliminado lógicamente no puede aparecer en nuevos menús
 * - Los OrderItems históricos no se ven afectados (snapshot de nombre/precio)
 */
import * as dishesRepo from './dishes.repository';
import { NotFoundError, BusinessRuleError } from '../../utils/errors';
import { buildPagination } from '../../utils/response';
import type { CreateDishInput, UpdateDishInput, DishQueryInput } from './dishes.schema';

/** Proyección segura de un Dish. price se convierte a number. */
export interface DishDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function toDTO(dish: Awaited<ReturnType<typeof dishesRepo.findById>>): DishDTO {
  if (!dish) throw new NotFoundError('Dish');
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    price: parseFloat(dish.price),
    imageUrl: dish.imageUrl,
    active: dish.active,
    version: dish.version,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
  };
}

export async function listDishes(query: DishQueryInput) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const { count, rows } = await dishesRepo.findAll(
    { active: query?.active },
    { page, limit },
  );

  return {
    data: rows.map(toDTO),
    pagination: buildPagination(count, page, limit),
  };
}

export async function getDish(id: string): Promise<DishDTO> {
  const dish = await dishesRepo.findById(id);
  if (!dish) throw new NotFoundError('Dish');
  return toDTO(dish);
}

export async function createDish(input: CreateDishInput): Promise<DishDTO> {
  const dish = await dishesRepo.create({
    name: input.name,
    description: input.description ?? null,
    price: String(input.price),
    imageUrl: input.imageUrl ?? null,
    active: input.active ?? true,
  });
  return toDTO(dish);
}

export async function updateDish(id: string, input: UpdateDishInput): Promise<DishDTO> {
  const dish = await dishesRepo.findById(id);
  if (!dish) throw new NotFoundError('Dish');

  const updates: Parameters<typeof dishesRepo.update>[1] = {
    version: dish.version + 1,
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description ?? null;
  if (input.price !== undefined) updates.price = String(input.price);
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl ?? null;
  if (input.active !== undefined) updates.active = input.active;

  await dishesRepo.update(dish, updates);
  const updated = await dishesRepo.findById(id);
  return toDTO(updated);
}

export async function deleteDish(id: string): Promise<void> {
  const dish = await dishesRepo.findById(id);
  if (!dish) throw new NotFoundError('Dish');

  // No bloquear la eliminación si ya estaba inactivo; es una operación de limpieza.
  // Si hay OrderItems activos, Sequelize podría fallar por FK — eso es correcto.
  await dishesRepo.softDelete(dish);
}

export async function getActiveDishes(): Promise<DishDTO[]> {
  const dishes = await dishesRepo.findAllActive();
  return dishes.map(toDTO);
}

/**
 * Selección aleatoria de platos activos para el sorteo.
 * No crea ni modifica ningún menú.
 */
export async function drawDishes(count: number): Promise<DishDTO[]> {
  const activeDishes = await dishesRepo.findAllActive();

  if (activeDishes.length < count) {
    throw new BusinessRuleError(
      `Not enough active dishes. Requested: ${count}, available: ${activeDishes.length}`,
    );
  }

  // Fisher-Yates shuffle y tomar los primeros `count`
  const shuffled = [...activeDishes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count).map(toDTO);
}
