/**
 * tests/unit/reports-timezone.test.ts
 *
 * Tests unitarios para resolvePeriod y la lógica de fecha/periodos en America/La_Paz.
 */
import { describe, it, expect } from 'vitest';
import { resolvePeriod, getTodayInLaPaz } from '../../src/utils/timezone';

describe('resolvePeriod — America/La_Paz period calculations', () => {
  it('should resolve "day" period defaulting to today when dateFrom is omitted', () => {
    const today = getTodayInLaPaz();
    const period = resolvePeriod('day');

    expect(period.periodType).toBe('day');
    expect(period.dateFrom).toBe(today);
    expect(period.dateTo).toBe(today);
    // startUTC debe ser todayT04:00:00.000Z
    expect(period.startUTC.toISOString()).toBe(`${today}T04:00:00.000Z`);
  });

  it('should resolve "day" period with explicit dateFrom', () => {
    const period = resolvePeriod('day', '2026-08-12');

    expect(period.periodType).toBe('day');
    expect(period.dateFrom).toBe('2026-08-12');
    expect(period.dateTo).toBe('2026-08-12');
    expect(period.startUTC.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    expect(period.endUTC.toISOString()).toBe('2026-08-13T03:59:59.999Z');
  });

  it('should resolve "week" period (Monday to Sunday in La Paz)', () => {
    // 2026-08-12 es Miércoles
    // La semana va de Lunes 2026-08-10 a Domingo 2026-08-16
    const period = resolvePeriod('week', '2026-08-12');

    expect(period.periodType).toBe('week');
    expect(period.dateFrom).toBe('2026-08-10'); // Lunes
    expect(period.dateTo).toBe('2026-08-16'); // Domingo
    expect(period.startUTC.toISOString()).toBe('2026-08-10T04:00:00.000Z');
    expect(period.endUTC.toISOString()).toBe('2026-08-17T03:59:59.999Z');
  });

  it('should resolve "month" period (1st to last day of month in La Paz)', () => {
    // Agosto 2026 -> 2026-08-01 a 2026-08-31
    const period = resolvePeriod('month', '2026-08-12');

    expect(period.periodType).toBe('month');
    expect(period.dateFrom).toBe('2026-08-01');
    expect(period.dateTo).toBe('2026-08-31');
    expect(period.startUTC.toISOString()).toBe('2026-08-01T04:00:00.000Z');
    expect(period.endUTC.toISOString()).toBe('2026-09-01T03:59:59.999Z');
  });

  it('should resolve "custom" period with dateFrom and dateTo', () => {
    const period = resolvePeriod('custom', '2026-08-01', '2026-08-10');

    expect(period.periodType).toBe('custom');
    expect(period.dateFrom).toBe('2026-08-01');
    expect(period.dateTo).toBe('2026-08-10');
    expect(period.startUTC.toISOString()).toBe('2026-08-01T04:00:00.000Z');
    expect(period.endUTC.toISOString()).toBe('2026-08-11T03:59:59.999Z');
  });

  it('should default to "custom" if period is omitted but dateFrom is provided', () => {
    const period = resolvePeriod(undefined, '2026-08-05', '2026-08-08');

    expect(period.periodType).toBe('custom');
    expect(period.dateFrom).toBe('2026-08-05');
    expect(period.dateTo).toBe('2026-08-08');
  });
});
