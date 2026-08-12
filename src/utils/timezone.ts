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
 *
 * Usamos Intl.DateTimeFormat (nativo, sin dependencias externas) para evitar
 * agregar librerías como luxon o date-fns-tz en este Sprint.
 * Si en el futuro se necesita más potencia, migrar a luxon y actualizar el ADR.
 */

export const BUSINESS_TZ = 'America/La_Paz';

/**
 * Retorna la fecha de negocio actual en formato YYYY-MM-DD
 * interpretada en America/La_Paz.
 *
 * Ejemplo: si son las 23:50 UTC pero en La Paz es 2026-08-11,
 * retorna '2026-08-11', no '2026-08-12'.
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
  // en-CA produce YYYY-MM-DD directamente
  return formatter.format(date);
}

/**
 * Verifica si un string tiene formato YYYY-MM-DD válido.
 * No reemplaza la validación Zod; se usa como guarda interna.
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
  // Offset fijo de La Paz: +4 horas sobre UTC (La Paz es UTC-4)
  const LAP_OFFSET_MS = 4 * 60 * 60 * 1000;
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setTime(start.getTime() + LAP_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}
