/**
 * src/modules/orders/order.model.ts
 *
 * Modelo Sequelize para la entidad Order.
 *
 * Notas:
 * - id es UUID generado por el CLIENTE (no defaultValue en BD). Esto permite
 *   que Flutter cree el UUID offline y lo envíe al sincronizar.
 * - order_number es asignado exclusivamente por el servidor; puede ser NULL
 *   hasta que el servidor lo procese.
 * - total se almacena como DECIMAL(10,2); Sequelize lo retorna como string.
 * - paranoid: true reservado para soft delete interno/sync. El flujo de
 *   negocio usa CANCELLED, no DELETE.
 * - version: campo para detección de conflictos en sincronización offline.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export type OrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'QR' | 'OTHER';

export interface OrderAttributes {
  id: string;
  orderNumber: string | null;
  customerName: string;
  locationText: string | null;
  total: string; // DECIMAL retornado como string por Sequelize
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  orderedAt: Date;
  createdBy: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type OrderCreationAttributes = Optional<
  OrderAttributes,
  'orderNumber' | 'locationText' | 'version' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare id: string;
  declare orderNumber: string | null;
  declare customerName: string;
  declare locationText: string | null;
  declare total: string;
  declare paymentMethod: PaymentMethod;
  declare status: OrderStatus;
  declare orderedAt: Date;
  declare createdBy: string;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      // Sin defaultValue: el cliente provee el UUID (offline-first)
    },
    orderNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'order_number',
    },
    customerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'customer_name',
    },
    locationText: {
      type: DataTypes.STRING(300),
      allowNull: true,
      field: 'location_text',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'payment_method',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ordered_at',
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
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    paranoid: true, // soft delete reservado para uso interno/sync
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['ordered_at'], name: 'idx_orders_ordered_at' },
      { fields: ['status'], name: 'idx_orders_status' },
      { fields: ['created_by'], name: 'idx_orders_created_by' },
    ],
  },
);
