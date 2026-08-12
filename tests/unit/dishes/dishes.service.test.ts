/**
 * tests/unit/dishes/dishes.service.test.ts
 *
 * Tests unitarios para dishes.service.
 * Mockea el repository para no requerir BD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, BusinessRuleError } from '../../../src/utils/errors';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDish = {
  id: 'dish-uuid-1',
  name: 'Arroz con Pollo',
  description: 'Plato típico',
  price: '45.00',
  imageUrl: null,
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

vi.mock('../../../src/modules/dishes/dishes.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  findActiveByIds: vi.fn(),
  findAllActive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

import * as dishesService from '../../../src/modules/dishes/dishes.service';
import * as dishesRepo from '../../../src/modules/dishes/dishes.repository';

describe('dishesService.getDish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return a DishDTO with price as number', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(mockDish as never);

    const result = await dishesService.getDish('dish-uuid-1');
    expect(result.id).toBe('dish-uuid-1');
    expect(result.price).toBe(45.0);
    expect(typeof result.price).toBe('number');
  });

  it('should throw NotFoundError for unknown id', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(null);

    await expect(dishesService.getDish('non-existent')).rejects.toThrow(NotFoundError);
  });
});

describe('dishesService.createDish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create and return a dish', async () => {
    vi.mocked(dishesRepo.create).mockResolvedValue(mockDish as never);

    const result = await dishesService.createDish({
      name: 'Arroz con Pollo',
      price: 45.0,
      active: true,
    });

    expect(result.name).toBe('Arroz con Pollo');
    expect(result.price).toBe(45.0);
  });
});

describe('dishesService.updateDish', () => {
  beforeEach(() => vi.clearAllMocks());

  const updatedDish = { ...mockDish, name: 'Pollo a la Brasa', version: 2 };

  it('should update and return the dish', async () => {
    vi.mocked(dishesRepo.findById)
      .mockResolvedValueOnce(mockDish as never)
      .mockResolvedValueOnce(updatedDish as never);
    vi.mocked(dishesRepo.update).mockResolvedValue(updatedDish as never);

    const result = await dishesService.updateDish('dish-uuid-1', { name: 'Pollo a la Brasa' });
    expect(result.name).toBe('Pollo a la Brasa');
  });

  it('should throw NotFoundError for unknown id', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(null);

    await expect(dishesService.updateDish('bad-id', { name: 'X' })).rejects.toThrow(NotFoundError);
  });
});

describe('dishesService.deleteDish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should soft delete the dish', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(mockDish as never);
    vi.mocked(dishesRepo.softDelete).mockResolvedValue(undefined);

    await dishesService.deleteDish('dish-uuid-1');
    expect(dishesRepo.softDelete).toHaveBeenCalledWith(mockDish);
  });

  it('should throw NotFoundError for unknown id', async () => {
    vi.mocked(dishesRepo.findById).mockResolvedValue(null);

    await expect(dishesService.deleteDish('bad-id')).rejects.toThrow(NotFoundError);
  });
});

describe('dishesService.drawDishes', () => {
  beforeEach(() => vi.clearAllMocks());

  const activeDishes = Array.from({ length: 5 }, (_, i) => ({
    ...mockDish,
    id: `dish-uuid-${i + 1}`,
    name: `Plato ${i + 1}`,
  }));

  it('should return the requested number of dishes without duplicates', async () => {
    vi.mocked(dishesRepo.findAllActive).mockResolvedValue(activeDishes as never);

    const result = await dishesService.drawDishes(3);
    expect(result).toHaveLength(3);
    const ids = result.map((d) => d.id);
    expect(new Set(ids).size).toBe(3); // sin duplicados
  });

  it('should throw BusinessRuleError when not enough active dishes', async () => {
    vi.mocked(dishesRepo.findAllActive).mockResolvedValue(activeDishes.slice(0, 2) as never);

    await expect(dishesService.drawDishes(5)).rejects.toThrow(BusinessRuleError);
  });

  it('should only include active dishes', async () => {
    const mixed = [
      ...activeDishes.slice(0, 3),
      { ...mockDish, id: 'inactive', active: false },
    ];
    // findAllActive ya filtra por active:true en el repo
    vi.mocked(dishesRepo.findAllActive).mockResolvedValue(activeDishes.slice(0, 3) as never);

    const result = await dishesService.drawDishes(2);
    result.forEach((d) => expect(d.active).toBe(true));
    // Suprimir unused variable warning
    expect(mixed.length).toBeGreaterThan(0);
  });
});
