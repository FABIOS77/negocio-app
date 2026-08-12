'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orders',
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
        onDelete: 'RESTRICT',
      },
      dish_name_snapshot: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
    });

    // CHECK quantity > 0
    await queryInterface.sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)',
    );

    // CHECK unit_price > 0
    await queryInterface.sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT order_items_unit_price_positive CHECK (unit_price > 0)',
    );

    // UNIQUE(order_id, dish_id) — un mismo plato no puede repetirse en el mismo pedido
    await queryInterface.addIndex('order_items', ['order_id', 'dish_id'], {
      unique: true,
      name: 'idx_order_items_order_dish_unique',
    });

    // Índice en order_id para joins y búsquedas por pedido
    await queryInterface.addIndex('order_items', ['order_id'], {
      name: 'idx_order_items_order_id',
    });

    // Índice en dish_id para reportes de producción
    await queryInterface.addIndex('order_items', ['dish_id'], {
      name: 'idx_order_items_dish_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
