'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_orders_order_number;',
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number) WHERE order_number IS NOT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_orders_order_number;',
    );
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX idx_orders_order_number ON orders (order_number) WHERE order_number IS NOT NULL;',
    );
  },
};
