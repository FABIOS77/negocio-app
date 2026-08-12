/**
 * src/utils/errors.ts
 *
 * Jerarquía de errores de dominio del backend.
 * Todos los errores extienden AppError, que incluye statusCode y code
 * para ser manejados de forma consistente por el error middleware.
 */

/**
 * Error base de la aplicación.
 * Nunca lanzar directamente; usar las subclases específicas.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Preservar el stack trace correcto en V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — El body, params o query no pasan la validación Zod. */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

/** 401 — Token inválido, expirado o ausente. */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'AUTHENTICATION_ERROR', message);
  }
}

/** 403 — Autenticado pero sin permiso para la acción. */
export class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'AUTHORIZATION_ERROR', message);
  }
}

/** 404 — Recurso no encontrado. */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

/**
 * 409 — Conflicto de datos:
 * - Duplicado (UUID, email, order_number, etc.)
 * - Conflicto de versión en sincronización
 * - Transición de estado inválida
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

/**
 * 422 — Regla de negocio violada:
 * - Plato inactivo en nuevo pedido
 * - Categoría inexistente
 * - Menú para fecha ya pasada (si aplica)
 */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(422, 'BUSINESS_RULE_VIOLATION', message);
  }
}
