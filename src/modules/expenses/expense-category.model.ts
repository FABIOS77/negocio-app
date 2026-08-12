/**
 * src/modules/expenses/expense-category.model.ts
 *
 * Modelo Sequelize para la entidad ExpenseCategory.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface ExpenseCategoryAttributes {
  id: string;
  name: string;
  active: boolean;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExpenseCategoryCreationAttributes = Optional<
  ExpenseCategoryAttributes,
  'id' | 'active' | 'version' | 'createdAt' | 'updatedAt'
>;

export class ExpenseCategory
  extends Model<ExpenseCategoryAttributes, ExpenseCategoryCreationAttributes>
  implements ExpenseCategoryAttributes
{
  declare id: string;
  declare name: string;
  declare active: boolean;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ExpenseCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'expense_categories',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'idx_expense_categories_name',
      },
    ],
  },
);
