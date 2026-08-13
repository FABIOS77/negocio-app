/**
 * scripts/cleanup-db.ts
 *
 * Herramienta de limpieza transaccional de datos de prueba para la salida a Producción.
 * Conserva la estructura de tablas, migraciones, restricciones y las 5 categorías base de gastos.
 * Conserva únicamente al usuario Administrador real de Producción.
 */
import { sequelize } from '../src/database/sequelize';

export async function executeProductionCleanup(prodAdminEmail = 'grecia@negociokatering.com'): Promise<void> {
  console.log(`🧹 Iniciando limpieza transaccional de la base de datos (Conservando admin: ${prodAdminEmail})...\n`);

  await sequelize.transaction(async (t) => {
    // 1. Order items & Orders
    await sequelize.query('DELETE FROM "order_items"', { transaction: t });
    await sequelize.query('DELETE FROM "orders"', { transaction: t });

    // 2. Daily Menu Dishes & Daily Menus
    await sequelize.query('DELETE FROM "daily_menu_dishes"', { transaction: t });
    await sequelize.query('DELETE FROM "daily_menus"', { transaction: t });

    // 3. Expenses
    await sequelize.query('DELETE FROM "expenses"', { transaction: t });

    // 4. Offline Sync & Change Log
    await sequelize.query('DELETE FROM "sync_operations"', { transaction: t });
    await sequelize.query('DELETE FROM "change_log"', { transaction: t });
    // Reset sequence if exists
    try {
      await sequelize.query('ALTER SEQUENCE change_log_server_change_id_seq RESTART WITH 1', { transaction: t });
    } catch {
      // Sequence might be named differently or standard identity
    }

    // 5. Dishes
    await sequelize.query('DELETE FROM "dishes"', { transaction: t });

    // 6. Refresh Tokens
    await sequelize.query('DELETE FROM "refresh_tokens"', { transaction: t });

    // 7. Users (Conservar solo el usuario real de producción)
    await sequelize.query(`DELETE FROM "users" WHERE LOWER("email") != LOWER('${prodAdminEmail}')`, { transaction: t });
  });

  console.log('✅ Limpieza de datos de prueba completada exitosamente.');
}

if (process.argv[1] && process.argv[1].includes('cleanup-db')) {
  (async () => {
    try {
      const email = process.env['BOOTSTRAP_ADMIN_EMAIL'] || 'grecia@negociokatering.com';
      await executeProductionCleanup(email);
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ERROR EN LIMPIEZA: ${msg}`);
      process.exit(1);
    }
  })();
}
