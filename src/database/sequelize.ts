/**
 * src/database/sequelize.ts
 *
 * Instancia compartida de Sequelize.
 * Todos los modelos importan esta instancia para registrarse.
 * La conexión real no se establece aquí; se llama a sequelize.authenticate()
 * en el arranque del servidor (server.ts).
 */
import { Sequelize } from 'sequelize';
import { env } from '../config/env';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? console.warn : false,

  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  dialectOptions:
    env.NODE_ENV === 'production'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false, // Requerido por Supabase
          },
        }
      : {},
});
