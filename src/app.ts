/**
 * src/app.ts
 *
 * Configuración de la aplicación Express.
 * No inicia el servidor ni la conexión a la BD (eso es responsabilidad de server.ts).
 * Exportar `app` permite importarlo en tests sin iniciar el servidor.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { globalRateLimit } from './middlewares/rate-limit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { sendSuccess, sendError } from './utils/response';

export const app = express();

// ─── Seguridad ────────────────────────────────────────────────────────────────

// Cabeceras de seguridad HTTP
app.use(helmet());

// CORS — configurado desde variable de entorno
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Rate limiting global
app.use(globalRateLimit);

// ─── Parsing ──────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rutas de sistema ─────────────────────────────────────────────────────────

/**
 * GET /health
 * Verificación básica de que el servidor está activo.
 * No expone información sensible.
 */
app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

// ─── Módulos de la API (se agregarán en sprints posteriores) ──────────────────
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/dishes', dishRoutes);
// ...

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError(res, 'NOT_FOUND', 'Route not found', 404);
});

// ─── Error handler (debe ser el último middleware) ────────────────────────────

app.use(errorMiddleware);
