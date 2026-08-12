/**
 * src/modules/expenses/expense.model.ts
 *
 * Modelo Sequelize para la entidad Expense.
 * Paranoid: true (soft delete por deleted_at).
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import type { PaymentMethod } from '../orders/order.model';

export interface ExpenseAttributes {
  id: string;
  description: string;
  amount: string; // DECIMAL retornado como string por Sequelize
  categoryId: string;
  paymentMethod: PaymentMethod;
  expenseDate: string; // YYYY-MM-DD
  createdBy: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type ExpenseCreationAttributes = Optional<
  ExpenseAttributes,
  'version' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export class Expense
  extends Model<ExpenseAttributes, ExpenseCreationAttributes>
  implements ExpenseAttributes
{
  declare id: string;
  declare description: string;
  declare amount: string;
  declare categoryId: string;
  declare paymentMethod: PaymentMethod;
  declare expenseDate: string;
  declare createdBy: string;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;
}

Expense.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
    },
    paymentMethod: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'payment_method',
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'expense_date',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'expenses',
    underscored: true,
    timestamps: true,
    paranoid: true, // soft delete por deleted_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['expense_date'], name: 'idx_expenses_expense_date' },
      { fields: ['category_id'], name: 'idx_expenses_category_id' },
      { fields: ['created_by'], name: 'idx_expenses_created_by' },
    ],
  },
);
