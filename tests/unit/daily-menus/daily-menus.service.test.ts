/**
 * tests/unit/daily-menus/daily-menus.service.test.ts
 *
 * Tests unitarios para daily-menus.service.
 * Mockea repositorios y sequelize para no requerir BD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, BusinessRuleError, NotFoundError } from '../../../src/utils/errors';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../src/database/sequelize', () => ({
  sequelize: {
    transaction: vi.fn((cb: (t: unknown) => Promise<unknown>) => cb({})),
  },
}));

const mockDish = {
  id: 'dish-1',
  name: 'Arroz con Pollo',
  price: '45.00',
  active: true,
  description: null,
  imageUrl: null,
};

const mockMenu = {
  id: 'menu-1',
  menuDate: '2026-08-12',
  active: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  get: vi.fn().mockReturnValue([mockDish]),
};

vi.mock('../../../src/modules/daily-menus/daily-menus.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByDate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../../src/modules/dishes/dishes.repository', () => ({
  findActiveByIds: vi.fn(),
  findAllActive: vi.fn(),
}));

vi.mock('../../../src/modules/dishes/dishes.service', () => ({
  drawDishes: vi.fn(),
}));

vi.mock('../../../src/utils/timezone', () => ({
  getTodayInLaPaz: vi.fn().mockReturnValue('2026-08-12'),
}));

import * as menusService from '../../../src/modules/daily-menus/daily-menus.service';
import * as menuRepo from '../../../src/modules/daily-menus/daily-menus.repository';
import * as dishesRepo from '../../../src/modules/dishes/dishes.repository';
import * as dishesService from '../../../src/modules/dishes/dishes.service';

describe('dailyMenusService.createMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a menu with valid dishes', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);
    vi.mocked(dishesRepo.findActiveByIds).mockResolvedValue([mockDish] as never);
    vi.mocked(menuRepo.create).mockResolvedValue(mockMenu as never);
    vi.mocked(menuRepo.findById).mockResolvedValue(mockMenu as never);

    const result = await menusService.createMenu({
      menuDate: '2026-08-12',
      dishIds: ['dish-1'],
      active: true,
    });

    expect(result.menuDate).toBe('2026-08-12');
    expect(result.dishes).toHaveLength(1);
  });

  it('should throw ConflictError if menu already exists for date', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(mockMenu as never);

    await expect(
      menusService.createMenu({ menuDate: '2026-08-12', dishIds: ['dish-1'], active: true }),
    ).rejects.toThrow(ConflictError);
  });

  it('should throw BusinessRuleError if dish does not exist or is inactive', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);
    // findActiveByIds devuelve 0 platos (no encontró los IDs o están inactivos)
    vi.mocked(dishesRepo.findActiveByIds).mockResolvedValue([]);

    await expect(
      menusService.createMenu({ menuDate: '2026-08-12', dishIds: ['bad-dish'], active: true }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe('dailyMenusService.getTodayMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return today menu in La Paz timezone', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(mockMenu as never);

    const result = await menusService.getTodayMenu();
    expect(result).not.toBeNull();
    expect(result?.menuDate).toBe('2026-08-12');
  });

  it('should return null when no menu for today', async () => {
    vi.mocked(menuRepo.findByDate).mockResolvedValue(null);

    const result = await menusService.getTodayMenu();
    expect(result).toBeNull();
  });
});

describe('dailyMenusService.updateMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should throw NotFoundError for unknown menu id', async () => {
    vi.mocked(menuRepo.findById).mockResolvedValue(null);

    await expect(menusService.updateMenu('bad-id', { active: false })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('should throw BusinessRuleError for inactive dish in update', async () => {
    vi.mocked(menuRepo.findById).mockResolvedValue(mockMenu as never);
    vi.mocked(dishesRepo.findActiveByIds).mockResolvedValue([]);

    await expect(
      menusService.updateMenu('menu-1', { dishIds: ['inactive-dish'] }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

describe('dailyMenusService.drawDishes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delegate to dishesService.drawDishes', async () => {
    const mockDrawResult = [{ id: 'dish-1', name: 'Plato 1', price: 45, active: true, description: null, imageUrl: null, version: 1, createdAt: new Date(), updatedAt: new Date() }];
    vi.mocked(dishesService.drawDishes).mockResolvedValue(mockDrawResult as never);

    const result = await menusService.drawDishes({ count: 1 });
    expect(result).toEqual(mockDrawResult);
    expect(dishesService.drawDishes).toHaveBeenCalledWith(1);
  });
});
