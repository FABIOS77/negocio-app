'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
      console.log('Skipping expense-categories seeder in production environment.');
      return;
    }

    const now = new Date();
    const categories = [
      {
        id: '550e8400-e29b-41d4-a716-446655440400',
        name: 'Insumos / Verduras y Carnes',
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440401',
        name: 'Servicios Básicos (Luz, Agua, Gas)',
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440402',
        name: 'Personal / Sueldos',
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440403',
        name: 'Equipamiento y Utensilios',
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440404',
        name: 'Otros Gastos Operativos',
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const cat of categories) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM expense_categories WHERE name = '${cat.name.replace(/'/g, "''")}'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('expense_categories', [cat]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('expense_categories', null, {});
  },
};
