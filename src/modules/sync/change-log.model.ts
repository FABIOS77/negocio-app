/**
 * src/modules/sync/change-log.model.ts
 *
 * Modelo Sequelize para la tabla `change_log`.
 * Almacena la secuencia mono-incremental de cambios del servidor para PULL con cursor.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import type { SyncOpType } from './sync-operation.model';

export interface ChangeLogAttributes {
  serverChangeId?: string; // BIGINT retornado como string en JS/Sequelize
  entityType: string;
  entityId: string;
  operation: SyncOpType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: Record<string, any>;
  version: number;
  createdAt?: Date;
}

export type ChangeLogCreationAttributes = Optional<
  ChangeLogAttributes,
  'serverChangeId' | 'createdAt'
>;

export class ChangeLog
  extends Model<ChangeLogAttributes, ChangeLogCreationAttributes>
  implements ChangeLogAttributes
{
  declare serverChangeId: string;
  declare entityType: string;
  declare entityId: string;
  declare operation: SyncOpType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare snapshot: Record<string, any>;
  declare version: number;
  declare readonly createdAt: Date;
}

ChangeLog.init(
  {
    serverChangeId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'server_change_id',
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'entity_id',
    },
    operation: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'change_log',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['server_change_id'], name: 'idx_change_log_cursor' },
      { fields: ['entity_type', 'entity_id'], name: 'idx_change_log_entity' },
    ],
  },
);
