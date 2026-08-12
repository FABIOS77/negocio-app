/**
 * src/server.ts
 *
 * Punto de entrada del servidor.
 * Responsabilidades:
 * 1. Configurar asociaciones entre modelos
 * 2. Verificar conexión a la base de datos
 * 3. Iniciar el servidor HTTP
 *
 * Importar `app` en tests directamente (no este archivo)
 * para evitar iniciar el servidor en cada test.
 */
import { app } from './app';
import { env } from './config/env';
import { sequelize } from './database/sequelize';
import { setupAssociations } from './database/associations';

async function start(): Promise<void> {
  // 1. Registrar asociaciones entre modelos
  setupAssociations();

  // 2. Verificar conexión a la base de datos
  try {
    await sequelize.authenticate();
    console.warn(`✅ Database connected (${env.NODE_ENV})`);
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }

  // 3. Iniciar servidor HTTP
  app.listen(env.PORT, () => {
    console.warn(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

start().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
