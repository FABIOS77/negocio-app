'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_menu_dishes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      daily_menu_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'daily_menus',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dish_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'dishes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        // No CASCADE delete: queremos mantener el histórico si el dish se elimina lógicamente
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // UNIQUE compuesto: un plato no puede repetirse en el mismo menú
    await queryInterface.addIndex('daily_menu_dishes', ['daily_menu_id', 'dish_id'], {
      name: 'idx_daily_menu_dishes_unique',
      unique: true,
    });

    // Índice para queries por menú
    await queryInterface.addIndex('daily_menu_dishes', ['daily_menu_id'], {
      name: 'idx_daily_menu_dishes_menu_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_menu_dishes');
  },
};
