'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dishes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // CHECK price > 0
    await queryInterface.sequelize.query(
      'ALTER TABLE dishes ADD CONSTRAINT dishes_price_positive CHECK (price > 0)',
    );

    // Índice en active para filtrar platos activos eficientemente
    await queryInterface.addIndex('dishes', ['active'], {
      name: 'idx_dishes_active',
    });

    // Índice en name para detectar duplicados (case-sensitive)
    await queryInterface.addIndex('dishes', ['name'], {
      name: 'idx_dishes_name',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dishes');
  },
};
