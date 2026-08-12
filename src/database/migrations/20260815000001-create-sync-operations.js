'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_operations', {
      operation_id: {
        type: Sequelize.UUID,
        primaryKey: true,
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
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      client_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      base_version: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      server_version: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      server_change_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      result_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      processed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // CHECK operation valid
    await queryInterface.sequelize.query(
      "ALTER TABLE sync_operations ADD CONSTRAINT sync_operations_operation_valid CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE'))",
    );

    // CHECK status valid
    await queryInterface.sequelize.query(
      "ALTER TABLE sync_operations ADD CONSTRAINT sync_operations_status_valid CHECK (status IN ('PROCESSED', 'DUPLICATE', 'CONFLICT', 'FAILED'))",
    );

    // Indexes
    await queryInterface.addIndex('sync_operations', ['entity_type', 'entity_id'], {
      name: 'idx_sync_operations_entity',
    });

    await queryInterface.addIndex('sync_operations', ['processed_by'], {
      name: 'idx_sync_operations_processed_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sync_operations');
  },
};
