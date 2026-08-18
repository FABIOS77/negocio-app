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
import ordersRoutes from './modules/orders/orders.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import reportsRoutes from './modules/reports/reports.routes';
import syncRoutes from './modules/sync/sync.routes';

import { sequelize } from './database/sequelize';

export const app = express();

// Configurar trust proxy para Render / proxies inversos (necesario para express-rate-limit)
app.set('trust proxy', 1);

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

// ─── Rutas de sistema ─────────────────────────────────────────────────────────

/**
 * GET /health
 * Verificación básica de que el servidor HTTP está activo.
 */
app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

/**
 * GET /health/db
 * Verificación de conectividad con la base de datos PostgreSQL.
 * Retorna 200 con status 'ok' o 503 con status 'unavailable'.
 * No expone credenciales ni detalles internos.
 */
app.get('/health/db', async (_req, res) => {
  try {
    await sequelize.authenticate();
    sendSuccess(res, { status: 'ok', database: 'connected' });
  } catch {
    sendError(res, 'SERVICE_UNAVAILABLE', 'Database connection unavailable', 503);
  }
});

// Rate limiting global
app.use(globalRateLimit);

// ─── Parsing ──────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));


// ─── API v1 ───────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/dishes', dishesRoutes);
app.use('/api/v1/daily-menus', dailyMenusRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/sync', syncRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError(res, 'NOT_FOUND', 'Route not found', 404);
});

// ─── Error handler (debe ser el último middleware) ────────────────────────────

app.use(errorMiddleware);
