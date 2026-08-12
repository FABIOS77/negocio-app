/**
 * tests/helpers/setup.ts
 *
 * Archivo de setup ejecutado por Vitest ANTES de cualquier test.
 * Establece las variables de entorno necesarias para que env.ts
 * pase la validación Zod sin requerir un archivo .env real.
 *
 * IMPORTANTE: estas variables son solo para testing.
 * Nunca usar credenciales reales aquí.
 */

// Variables mínimas para que env.ts pase la validación
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] || 'postgresql://test:test@localhost:5432/negocio_test';
process.env['JWT_ACCESS_SECRET'] =
  'test-access-secret-that-is-long-enough-to-pass-zod-validation';
process.env['JWT_REFRESH_SECRET'] =
  'test-refresh-secret-different-from-access-long-enough-32chars';
process.env['ACCESS_TOKEN_EXPIRES'] = '15m';
process.env['REFRESH_TOKEN_EXPIRES'] = '30d';
process.env['CORS_ORIGIN'] = 'http://localhost:3000';
