/**
 * src/utils/response.ts
 *
 * Helpers para construir respuestas API consistentes.
 *
 * Formato de éxito:  { success: true, data: T }
 * Formato de error:  { success: false, error: { code, message, details? } }
 *
 * Todos los endpoints deben usar estas funciones en lugar de res.json() directamente.
 */
import type { Response } from 'express';

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Envía una respuesta de éxito.
 * @param res - Express Response
 * @param data - Datos a retornar
 * @param statusCode - HTTP status (default 200)
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

/**
 * Envía una respuesta paginada.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  statusCode = 200,
): void {
  const body: PaginatedResponse<T> = { success: true, data, pagination };
  res.status(statusCode).json(body);
}

/**
 * Construye la metadata de paginación.
 */
export function buildPagination(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Envía una respuesta de error.
 * Nunca usar directamente en controllers; el error middleware la usa.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 500,
  details?: unknown,
): void {
  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  res.status(statusCode).json(body);
}
