'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('change_log', {
      server_change_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      operation: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      snapshot: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // CHECK operation valid
    await queryInterface.sequelize.query(
      "ALTER TABLE change_log ADD CONSTRAINT change_log_operation_valid CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE'))",
    );

    // Indexes
    await queryInterface.addIndex('change_log', ['server_change_id'], {
      name: 'idx_change_log_cursor',
    });

    await queryInterface.addIndex('change_log', ['entity_type', 'entity_id'], {
      name: 'idx_change_log_entity',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('change_log');
  },
};
