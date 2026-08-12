/**
 * src/modules/daily-menus/daily-menu.model.ts
 *
 * Modelo Sequelize para la entidad DailyMenu.
 *
 * Notas:
 * - menu_date es tipo DATEONLY (DATE en PostgreSQL, sin hora).
 *   Se almacena como string 'YYYY-MM-DD'.
 * - La interpretación de zona horaria (America/La_Paz) se hace en el Service.
 * - Los platos del menú se acceden via la asociación 'dishes' (through DailyMenuDish).
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface DailyMenuAttributes {
  id: string;
  menuDate: string; // 'YYYY-MM-DD'
  active: boolean;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DailyMenuCreationAttributes = Optional<
  DailyMenuAttributes,
  'id' | 'active' | 'version' | 'createdAt' | 'updatedAt'
>;

export class DailyMenu
  extends Model<DailyMenuAttributes, DailyMenuCreationAttributes>
  implements DailyMenuAttributes
{
  declare id: string;
  declare menuDate: string;
  declare active: boolean;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DailyMenu.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    menuDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
      field: 'menu_date',
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
    tableName: 'daily_menus',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['menu_date'], name: 'idx_daily_menus_date' }],
  },
);
