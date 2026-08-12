'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'expense_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      expense_date: {
        type: Sequelize.DATEONLY,
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

    // CHECK amount > 0
    await queryInterface.sequelize.query(
      'ALTER TABLE expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0)',
    );

    // CHECK payment_method válido
    await queryInterface.sequelize.query(
      "ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_valid CHECK (payment_method IN ('CASH', 'QR', 'OTHER'))",
    );

    // Índices
    await queryInterface.addIndex('expenses', ['expense_date'], {
      name: 'idx_expenses_expense_date',
    });

    await queryInterface.addIndex('expenses', ['category_id'], {
      name: 'idx_expenses_category_id',
    });

    await queryInterface.addIndex('expenses', ['created_by'], {
      name: 'idx_expenses_created_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  },
};
