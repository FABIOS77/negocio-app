/**
 * scripts/inventory-data.ts
 *
 * Herramienta de lectura e inventario de datos de la base de datos PostgreSQL.
 * Realiza un reporte consolidado del conteo de filas en las 11 tablas del sistema.
 *
 * NO realiza ninguna modificación, borrado o truncado.
 */
import { sequelize } from '../src/database/sequelize';

export interface TableInventory {
  table: string;
  count: number;
}

export async function getDatabaseInventory(): Promise<TableInventory[]> {
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

  const inventory: TableInventory[] = [];

  for (const table of tables) {
    const [result] = (await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM "${table}"`,
    )) as Array<Array<{ count: number }>>;

    const count = result[0]?.count ?? 0;
    inventory.push({ table, count });
  }

  return inventory;
}

if (process.argv[1] && process.argv[1].includes('inventory-data')) {
  (async () => {
    try {
      console.log('📊 Generando inventario de datos en PostgreSQL (Solo Lectura)...\n');
      const inventory = await getDatabaseInventory();

      console.log('┌──────────────────────┬──────────────┐');
      console.log('│ Tabla                │ Nº Registros │');
      console.log('├──────────────────────┼──────────────┤');
      let totalRows = 0;
      for (const item of inventory) {
        console.log(`│ ${item.table.padEnd(20)} │ ${String(item.count).padStart(12)} │`);
        totalRows += item.count;
      }
      console.log('├──────────────────────┼──────────────┤');
      console.log(`│ TOTAL REGISTROS      │ ${String(totalRows).padStart(12)} │`);
      console.log('└──────────────────────┴──────────────┘\n');

      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ERROR OBTENIENDO INVENTARIO: ${msg}`);
      process.exit(1);
    }
  })();
}
