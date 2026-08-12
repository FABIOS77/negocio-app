/**
 * src/config/constants.ts
 *
 * Constantes de dominio compartidas en toda la aplicación.
 * No incluir lógica aquí, solo valores fijos tipados.
 */

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  QR: 'QR',
  OTHER: 'OTHER',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const SYNC_OPERATION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type SyncOperation = (typeof SYNC_OPERATION)[keyof typeof SYNC_OPERATION];

export const SYNC_STATUS = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

/** Timezone de negocio. Todos los reportes y fechas de negocio usan esta zona. */
export const BUSINESS_TIMEZONE = 'America/La_Paz';

/** Moneda de operación en V1. */
export const BUSINESS_CURRENCY = 'BOB';

/** Formato de order_number: YYYYMMDD-XXXX */
export const ORDER_NUMBER_PREFIX_FORMAT = 'YYYYMMDD';
export const ORDER_NUMBER_PAD_LENGTH = 4;
