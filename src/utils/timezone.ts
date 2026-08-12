/**
 * src/utils/timezone.ts
 *
 * Helpers de zona horaria para el negocio.
 * Business timezone: America/La_Paz (UTC-4, sin DST).
 *
 * Reglas:
 * - Timestamps técnicos se almacenan en UTC (TIMESTAMPTZ).
 * - Fechas de negocio (menu_date, expense_date) se interpretan en America/La_Paz.
 * - "Hoy" siempre es la fecha actual en La Paz, no en UTC.
 */

export const BUSINESS_TZ = 'America/La_Paz';

/**
 * Retorna la fecha de negocio actual en formato YYYY-MM-DD
 * interpretada en America/La_Paz.
 */
export function getTodayInLaPaz(): string {
  return toLocalDate(new Date());
}

/**
 * Convierte un objeto Date (UTC) a la fecha de negocio en YYYY-MM-DD (La Paz).
 */
export function toLocalDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Verifica si un string tiene formato YYYY-MM-DD válido.
 */
export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

/**
 * Convierte una fecha de negocio YYYY-MM-DD (interpretada en La Paz) a
 * un rango UTC [start, end] para uso en queries BETWEEN.
 *
 * La Paz = UTC-4 → 2026-08-01 La Paz = 2026-08-01T04:00:00Z a 2026-08-02T03:59:59.999Z
 */
export function dateRangeUTC(date: string): { start: Date; end: Date } {
  const LAP_OFFSET_MS = 4 * 60 * 60 * 1000;
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setTime(start.getTime() + LAP_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * Convierte un rango de fechas de negocio [dateFrom, dateTo] (YYYY-MM-DD en La Paz)
 * a un rango UTC [start, end] para queries BETWEEN.
 */
export function customRangeUTC(dateFrom: string, dateTo: string): { start: Date; end: Date } {
  const { start } = dateRangeUTC(dateFrom);
  const { end } = dateRangeUTC(dateTo);
  return { start, end };
}

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

export interface ResolvedPeriod {
  periodType: PeriodType;
  dateFrom: string;
  dateTo: string;
  startUTC: Date;
  endUTC: Date;
}

/**
 * Resuelve las fechas de inicio y fin (YYYY-MM-DD en La Paz) y sus equivalentes UTC
 * basándose en el tipo de periodo ('day', 'week', 'month', 'custom') y opcionalmente dateFrom / dateTo.
 */
export function resolvePeriod(
  period?: PeriodType,
  dateFrom?: string,
  dateTo?: string,
): ResolvedPeriod {
  const today = getTodayInLaPaz();
  let resolvedType: PeriodType = period ?? 'day';

  if (!period && (dateFrom || dateTo)) {
    resolvedType = 'custom';
  }

  let finalFrom = today;
  let finalTo = today;

  if (resolvedType === 'day') {
    finalFrom = dateFrom ?? today;
    finalTo = dateFrom ?? today;
  } else if (resolvedType === 'week') {
    // Lunes a Domingo de la semana actual en La Paz (o la semana correspondiente a dateFrom)
    const refDateStr = dateFrom ?? today;
    const refDate = new Date(`${refDateStr}T12:00:00.000Z`); // Mediodía para evitar bordes
    const dayOfWeek = refDate.getUTCDay(); // 0 = Domingo, 1 = Lunes, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(refDate);
    monday.setUTCDate(refDate.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    finalFrom = monday.toISOString().substring(0, 10);
    finalTo = sunday.toISOString().substring(0, 10);
  } else if (resolvedType === 'month') {
    const refDateStr = dateFrom ?? today;
    const year = parseInt(refDateStr.substring(0, 4), 10);
    const month = parseInt(refDateStr.substring(5, 7), 10);

    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    finalFrom = firstDay;
    finalTo = lastDay;
  } else if (resolvedType === 'custom') {
    finalFrom = dateFrom ?? today;
    finalTo = dateTo ?? dateFrom ?? today;
  }

  const { start: startUTC, end: endUTC } = customRangeUTC(finalFrom, finalTo);

  return {
    periodType: resolvedType,
    dateFrom: finalFrom,
    dateTo: finalTo,
    startUTC,
    endUTC,
  };
}
