/**
 * src/modules/orders/order-item.model.ts
 *
 * Modelo Sequelize para la entidad OrderItem.
 *
 * Notas:
 * - unit_price y dish_name_snapshot son snapshots históricos copiados al crear
 *   el pedido. Nunca se actualizan aunque el Dish sea modificado posteriormente.
 * - subtotal = quantity * unit_price (calculado en backend, persistido en BD).
 * - UNIQUE(order_id, dish_id) — enforceado en BD y en el servicio.
 * - Sin timestamps propios: el contexto temporal lo provee el Order padre.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  dishId: string;
  dishNameSnapshot: string;
  quantity: number;
  unitPrice: string; // DECIMAL retornado como string por Sequelize
  subtotal: string; // DECIMAL retornado como string por Sequelize
}

export type OrderItemCreationAttributes = Optional<OrderItemAttributes, 'id'>;

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  declare id: string;
  declare orderId: string;
  declare dishId: string;
  declare dishNameSnapshot: string;
  declare quantity: number;
  declare unitPrice: string;
  declare subtotal: string;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
    },
    dishId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'dish_id',
    },
    dishNameSnapshot: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'dish_name_snapshot',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'order_items',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['order_id', 'dish_id'],
        name: 'idx_order_items_order_dish_unique',
      },
      { fields: ['order_id'], name: 'idx_order_items_order_id' },
      { fields: ['dish_id'], name: 'idx_order_items_dish_id' },
    ],
  },
);
