/**
 * scripts/backup-db.ts
 *
 * Herramienta de respaldo (Backup) de la base de datos PostgreSQL.
 * Exporta todas las tablas, esquemas y registros a formato JSON y SQL.
 */
import fs from 'fs';
import path from 'path';
import { sequelize } from '../src/database/sequelize';

export async function createDatabaseBackup(): Promise<string> {
  const tables = [
    'users',
    'refresh_tokens',
    'dishes',
    'daily_menus',
    'daily_menu_dishes',
    'orders',
    'order_items',
    'expense_categories',
    'expenses',
    'sync_operations',
    'change_log',
  ];

  const backupData: Record<string, unknown[]> = {};
  let sqlDump = `-- Backup Negocio Katering ${new Date().toISOString()}\n\n`;

  for (const table of tables) {
    const [rows] = await sequelize.query(`SELECT * FROM "${table}"`);
    backupData[table] = rows as unknown[];
    sqlDump += `-- Tabla: ${table} (${(rows as unknown[]).length} registros)\n`;
    for (const row of rows as Record<string, unknown>[]) {
      const keys = Object.keys(row).map((k) => `"${k}"`).join(', ');
      const values = Object.values(row)
        .map((v) => {
          if (v === null) return 'NULL';
          if (typeof v === 'number' || typeof v === 'boolean') return String(v);
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        })
        .join(', ');
      sqlDump += `INSERT INTO "${table}" (${keys}) VALUES (${values});\n`;
    }
    sqlDump += '\n';
  }

  const filenameJson = 'backup_katering_pre_cleanup.json';
  const filenameSql = 'backup_katering_pre_cleanup.sql';
  const filepathJson = path.join(process.cwd(), filenameJson);
  const filepathSql = path.join(process.cwd(), filenameSql);

  fs.writeFileSync(filepathJson, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(filepathSql, sqlDump, 'utf-8');

  return filepathJson;
}

if (process.argv[1] && process.argv[1].includes('backup-db')) {
  (async () => {
    try {
      console.log('💾 Creando backup completo de la base de datos PostgreSQL...\n');
      const backupPath = await createDatabaseBackup();
      console.log(`✅ BACKUP EXITOSO: Guardado en ${backupPath} y backup_katering_pre_cleanup.sql`);
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ERROR CREANDO BACKUP: ${msg}`);
      process.exit(1);
    }
  })();
}
