'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const sampleDishes = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Sopa de Maní',
        description: 'Sopa tradicional boliviana con fideos y verduras',
        price: '20.00',
        image_url: null,
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Arroz con Pollo',
        description: 'Plato fuerte con ensalada fresca',
        price: '25.00',
        image_url: null,
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Silpancho Cochabambino',
        description: 'Milanesa con huevo frito, arroz y papa',
        price: '30.00',
        image_url: null,
        active: true,
        version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ];

    for (const dish of sampleDishes) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM dishes WHERE name = '${dish.name.replace(/'/g, "''")}'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('dishes', [dish]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('dishes', null, {});
  },
};
