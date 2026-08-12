/**
 * src/modules/dishes/dish.model.ts
 *
 * Modelo Sequelize para la entidad Dish.
 *
 * Notas:
 * - paranoid: true habilita soft delete (deleted_at). Los platos eliminados
 *   lógicamente no aparecen en queries normales pero se preservan para historial.
 * - price se almacena como DECIMAL(10,2) en BOB. Sequelize lo devuelve como string;
 *   el servicio/DTO lo convierte a número.
 * - version: campo para sincronización offline.
 * - No incluir lógica de negocio aquí; pertenece al Service.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface DishAttributes {
  id: string;
  name: string;
  description: string | null;
  price: string; // DECIMAL retornado como string por Sequelize
  imageUrl: string | null;
  active: boolean;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type DishCreationAttributes = Optional<
  DishAttributes,
  'id' | 'description' | 'imageUrl' | 'active' | 'version' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export class Dish extends Model<DishAttributes, DishCreationAttributes> implements DishAttributes {
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare price: string;
  declare imageUrl: string | null;
  declare active: boolean;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;
}

Dish.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url',
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
    tableName: 'dishes',
    underscored: true,
    timestamps: true,
    paranoid: true, // habilita soft delete vía deleted_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['active'], name: 'idx_dishes_active' },
      { fields: ['name'], name: 'idx_dishes_name' },
    ],
  },
);
