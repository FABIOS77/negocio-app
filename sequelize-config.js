// sequelize-config.js — Configuración de Sequelize CLI por entorno.
// Este archivo es CJS porque sequelize-cli lo requiere así.
// Las credenciales provienen exclusivamente de variables de entorno.

'use strict';

require('dotenv').config();

/** @type {import('sequelize').Options} */
const baseOptions = {
  dialect: 'postgres',
  logging: false,
};

/** @type {import('sequelize').Options} */
const sslOptions = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Necesario para Supabase
    },
  },
};

module.exports = {
  development: {
    ...baseOptions,
    url: process.env.DATABASE_URL,
    logging: console.log,
  },

  test: {
    ...baseOptions,
    url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
  },

  production: {
    ...baseOptions,
    ...sslOptions,
    url: process.env.DATABASE_URL,
  },
};
