/**
 * src/modules/daily-menus/daily-menu-dish.model.ts
 *
 * Tabla de unión entre DailyMenu y Dish (many-to-many).
 *
 * Notas:
 * - UNIQUE compuesto (daily_menu_id, dish_id) garantizado a nivel de BD y modelo.
 * - onDelete RESTRICT en dish_id: no se puede eliminar un Dish que esté en un menú.
 *   El soft delete de Dish (paranoid) no activa este RESTRICT porque no borra la fila.
 * - Las relaciones se definen en database/associations.ts.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface DailyMenuDishAttributes {
  id: string;
  dailyMenuId: string;
  dishId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DailyMenuDishCreationAttributes = Optional<
  DailyMenuDishAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

export class DailyMenuDish
  extends Model<DailyMenuDishAttributes, DailyMenuDishCreationAttributes>
  implements DailyMenuDishAttributes
{
  declare id: string;
  declare dailyMenuId: string;
  declare dishId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DailyMenuDish.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    dailyMenuId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'daily_menu_id',
    },
    dishId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'dish_id',
    },
  },
  {
    sequelize,
    tableName: 'daily_menu_dishes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['daily_menu_id', 'dish_id'],
        name: 'idx_daily_menu_dishes_unique',
      },
      {
        fields: ['daily_menu_id'],
        name: 'idx_daily_menu_dishes_menu_id',
      },
    ],
  },
);
