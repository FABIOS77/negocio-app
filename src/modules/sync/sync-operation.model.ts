/**
 * src/modules/sync/sync-operation.model.ts
 *
 * Modelo Sequelize para la tabla `sync_operations`.
 * Registra cada operación enviada por los clientes para idempotencia y auditoría.
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export type SyncOpType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PROCESSED' | 'DUPLICATE' | 'CONFLICT' | 'FAILED';

export interface SyncOperationAttributes {
  operationId: string;
  entityType: string;
  entityId: string;
  operation: SyncOpType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  clientTimestamp: Date;
  baseVersion: number | null;
  status: SyncStatus;
  errorCode: string | null;
  errorMessage: string | null;
  serverVersion: number | null;
  serverChangeId: string | null; // BIGINT viene como string en JS/Sequelize
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultData: Record<string, any> | null;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt?: Date;
}

export type SyncOperationCreationAttributes = Optional<
  SyncOperationAttributes,
  | 'baseVersion'
  | 'errorCode'
  | 'errorMessage'
  | 'serverVersion'
  | 'serverChangeId'
  | 'resultData'
  | 'processedBy'
  | 'processedAt'
  | 'createdAt'
>;

export class SyncOperation
  extends Model<SyncOperationAttributes, SyncOperationCreationAttributes>
  implements SyncOperationAttributes
{
  declare operationId: string;
  declare entityType: string;
  declare entityId: string;
  declare operation: SyncOpType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare payload: Record<string, any>;
  declare clientTimestamp: Date;
  declare baseVersion: number | null;
  declare status: SyncStatus;
  declare errorCode: string | null;
  declare errorMessage: string | null;
  declare serverVersion: number | null;
  declare serverChangeId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare resultData: Record<string, any> | null;
  declare processedBy: string | null;
  declare processedAt: Date | null;
  declare readonly createdAt: Date;
}

SyncOperation.init(
  {
    operationId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'operation_id',
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
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    clientTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'client_timestamp',
    },
    baseVersion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'base_version',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    errorCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'error_code',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    serverVersion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'server_version',
    },
    serverChangeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'server_change_id',
    },
    resultData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'result_data',
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'processed_by',
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
  },
  {
    sequelize,
    tableName: 'sync_operations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // sin updated_at
    indexes: [
      { fields: ['entity_type', 'entity_id'], name: 'idx_sync_operations_entity' },
      { fields: ['processed_by'], name: 'idx_sync_operations_processed_by' },
    ],
  },
);
