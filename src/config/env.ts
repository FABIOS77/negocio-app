/**
 * src/config/env.ts
 *
 * Valida las variables de entorno al inicio de la aplicación usando Zod.
 * Si alguna variable requerida falta o es inválida, el proceso termina con un error claro.
 * Nunca debe importar secretos directamente; solo lee process.env.
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Carga .env antes de validar (en producción las variables ya están en el entorno)
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('*'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

export type Env = typeof env;
