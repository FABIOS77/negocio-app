/**
 * tests/unit/orders-timezone.test.ts
 *
 * Tests unitarios para la interpretación de fechas en America/La_Paz.
 *
 * La Paz = UTC-4 (sin DST).
 *
 * Casos de borde:
 * - Pedido a las 23:55 La Paz (03:55 UTC del día siguiente) → pertenece al día anterior en LaPaz
 * - Pedido a las 00:05 La Paz (04:05 UTC del mismo día) → pertenece al día corriente en LaPaz
 */
import { describe, it, expect } from 'vitest';
import { dateRangeUTC, toLocalDate } from '../../src/utils/timezone';

describe('dateRangeUTC — America/La_Paz interpretation', () => {
  it('should return correct UTC range for 2026-08-13 in La Paz', () => {
    // La Paz es UTC-4
    // 2026-08-13T00:00:00 LaPaz = 2026-08-13T04:00:00Z
    // 2026-08-13T23:59:59 LaPaz = 2026-08-14T03:59:59Z
    const { start, end } = dateRangeUTC('2026-08-13');

    expect(start.toISOString()).toBe('2026-08-13T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-14T03:59:59.999Z');
  });

  it('should include order at 23:55 La Paz time (next UTC day)', () => {
    // Las 23:55 en La Paz = 2026-08-14T03:55:00Z
    // Debe estar dentro del rango de 2026-08-13 en La Paz
    const { start, end } = dateRangeUTC('2026-08-13');
    const orderTimestamp = new Date('2026-08-14T03:55:00.000Z');

    expect(orderTimestamp >= start).toBe(true);
    expect(orderTimestamp <= end).toBe(true);
  });

  it('should exclude order at 00:05 UTC of the day (which is still previous day in La Paz)', () => {
    // 2026-08-13T00:05:00Z = 2026-08-12T20:05:00 LaPaz → pertenece al 12, no al 13
    const { start } = dateRangeUTC('2026-08-13');
    const orderTimestamp = new Date('2026-08-13T00:05:00.000Z');

    expect(orderTimestamp < start).toBe(true);
  });

  it('should include order at 00:05 La Paz (04:05 UTC)', () => {
    // 2026-08-13T04:05:00Z = 2026-08-13T00:05:00 LaPaz → pertenece al 13
    const { start, end } = dateRangeUTC('2026-08-13');
    const orderTimestamp = new Date('2026-08-13T04:05:00.000Z');

    expect(orderTimestamp >= start).toBe(true);
    expect(orderTimestamp <= end).toBe(true);
  });
});

describe('toLocalDate — converts UTC timestamp to La Paz date', () => {
  it('should return La Paz date, not UTC date, for timestamps near midnight', () => {
    // 2026-08-14T03:30:00Z = 2026-08-13T23:30:00 LaPaz
    const utcDate = new Date('2026-08-14T03:30:00.000Z');
    const localDate = toLocalDate(utcDate);

    // En La Paz sigue siendo el 13 de agosto
    expect(localDate).toBe('2026-08-13');
  });

  it('should return correct date for midday timestamp', () => {
    const utcDate = new Date('2026-08-13T16:00:00.000Z'); // 12:00 LaPaz
    const localDate = toLocalDate(utcDate);
    expect(localDate).toBe('2026-08-13');
  });

  it('should return next day in La Paz for UTC timestamps after 04:00Z', () => {
    // 2026-08-13T04:01:00Z = 2026-08-13T00:01:00 LaPaz
    const utcDate = new Date('2026-08-13T04:01:00.000Z');
    const localDate = toLocalDate(utcDate);
    expect(localDate).toBe('2026-08-13');
  });
});

describe('order_number date component', () => {
  it('should use La Paz date in order_number, not UTC date', () => {
    // Si ordered_at = 2026-08-14T03:55:00Z (23:55 La Paz del 13)
    // El order_number debe ser 20260813-XXXX, no 20260814-XXXX
    const orderedAt = new Date('2026-08-14T03:55:00.000Z');
    const localDate = toLocalDate(orderedAt);
    const dateComponent = localDate.replace(/-/g, '');

    expect(dateComponent).toBe('20260813');
  });
});
