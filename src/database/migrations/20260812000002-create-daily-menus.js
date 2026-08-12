'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_menus', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      menu_date: {
        // DATE (sin hora) — se interpreta en America/La_Paz
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true,
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
    });

    // Índice único en menu_date (garantiza un único menú por fecha)
    await queryInterface.addIndex('daily_menus', ['menu_date'], {
      name: 'idx_daily_menus_date',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_menus');
  },
};
