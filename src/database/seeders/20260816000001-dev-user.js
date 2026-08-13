'use strict';

const argon2 = require('argon2');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
      console.log('Skipping dev-user seeder in production environment.');
      return;
    }

    // Hash pre-generado con argon2id para la contraseña por defecto: Password123!
    const passwordHash = await argon2.hash('Password123!', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@negocio.com'",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          id: '550e8400-e29b-41d4-a716-446655440200',
          name: 'Admin Negocio Dev',
          email: 'admin@negocio.com',
          password_hash: passwordHash,
          active: true,
          version: 1,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@negocio.com' });
  },
};
