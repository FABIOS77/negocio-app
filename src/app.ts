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

// ─── Rutas de módulos ─────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import dishesRoutes from './modules/dishes/dishes.routes';
import dailyMenusRoutes from './modules/daily-menus/daily-menus.routes';

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

// ─── API v1 ───────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/dishes', dishesRoutes);
app.use('/api/v1/daily-menus', dailyMenusRoutes);

// Módulos futuros (Sprint 3+):
// app.use('/api/v1/orders', ordersRoutes);
// app.use('/api/v1/expenses', expensesRoutes);
// app.use('/api/v1/reports', reportsRoutes);
// app.use('/api/v1/sync', syncRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError(res, 'NOT_FOUND', 'Route not found', 404);
});

// ─── Error handler (debe ser el último middleware) ────────────────────────────

app.use(errorMiddleware);
