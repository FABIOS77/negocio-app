/**
 * src/modules/sync/sync.repository.ts
 *
 * Acceso a datos para sync_operations y change_log.
 */
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { SyncOperation, type SyncOperationCreationAttributes } from './sync-operation.model';
import { ChangeLog, type ChangeLogCreationAttributes } from './change-log.model';

export async function findSyncOperation(operationId: string): Promise<SyncOperation | null> {
  return SyncOperation.findByPk(operationId);
}

export async function recordSyncOperation(
  data: SyncOperationCreationAttributes,
  transaction?: Transaction,
): Promise<SyncOperation> {
  return SyncOperation.create(data, { transaction });
}

export async function recordChangeLog(
  data: ChangeLogCreationAttributes,
  transaction?: Transaction,
): Promise<ChangeLog> {
  return ChangeLog.create(data, { transaction });
}

export interface GetChangesOptions {
  cursor: number;
  limit: number;
  entityTypes?: string[];
}

export async function getChanges(options: GetChangesOptions) {
  const where: WhereOptions = {
    serverChangeId: {
      [Op.gt]: options.cursor,
    },
  };

  if (options.entityTypes && options.entityTypes.length > 0) {
    where['entityType'] = {
      [Op.in]: options.entityTypes,
    };
  }

  const rows = await ChangeLog.findAll({
    where,
    order: [['server_change_id', 'ASC']],
    limit: options.limit + 1, // solicitar 1 más para detectar has_more
  });

  const hasMore = rows.length > options.limit;
  const resultRows = hasMore ? rows.slice(0, options.limit) : rows;

  let nextCursor = options.cursor;
  if (resultRows.length > 0) {
    const last = resultRows[resultRows.length - 1];
    nextCursor = parseInt(last.serverChangeId, 10);
  }

  return {
    changes: resultRows,
    nextCursor,
    hasMore,
  };
}
