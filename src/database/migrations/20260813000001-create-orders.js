'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      order_number: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      customer_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      location_text: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      ordered_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    // CHECK total >= 0
    await queryInterface.sequelize.query(
      'ALTER TABLE orders ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0)',
    );

    // CHECK payment_method válido
    await queryInterface.sequelize.query(
      "ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid CHECK (payment_method IN ('CASH', 'QR', 'OTHER'))",
    );

    // CHECK status válido
    await queryInterface.sequelize.query(
      "ALTER TABLE orders ADD CONSTRAINT orders_status_valid CHECK (status IN ('PENDING', 'DELIVERED', 'CANCELLED'))",
    );

    // UNIQUE order_number — sparse: solo afecta filas donde order_number IS NOT NULL
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX idx_orders_order_number ON orders (order_number) WHERE order_number IS NOT NULL',
    );

    // Índice en ordered_at para queries por fecha (el más frecuente)
    await queryInterface.addIndex('orders', ['ordered_at'], {
      name: 'idx_orders_ordered_at',
    });

    // Índice en status para filtrar por estado
    await queryInterface.addIndex('orders', ['status'], {
      name: 'idx_orders_status',
    });

    // Índice en created_by para consultas por usuario
    await queryInterface.addIndex('orders', ['created_by'], {
      name: 'idx_orders_created_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
