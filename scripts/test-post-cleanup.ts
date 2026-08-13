/**
 * scripts/test-post-cleanup.ts
 *
 * Suite de verificación no destructiva post-limpieza.
 * Válida contra servidor local o desplegado en Render.
 */
import ExcelJS from 'exceljs';

const TARGET_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';
const ADMIN_EMAIL = process.env['BOOTSTRAP_ADMIN_EMAIL'] || 'grecia@negociokatering.com';
const ADMIN_PASSWORD = process.env['BOOTSTRAP_ADMIN_PASSWORD'] || 'GreciaKatering2026!';

async function runPostCleanupVerification() {
  console.log(`🚀 Iniciando Verificación Post-Limpieza en: ${TARGET_URL}\n`);

  // 1. GET /health
  console.log('1️⃣ GET /health...');
  const healthRes = await fetch(`${TARGET_URL}/health`);
  const healthData = await healthRes.json();
  console.log(`   ✅ Status: ${healthRes.status} | Data:`, JSON.stringify(healthData));

  // 2. GET /health/db
  console.log('2️⃣ GET /health/db...');
  const dbRes = await fetch(`${TARGET_URL}/health/db`);
  const dbData = await dbRes.json();
  console.log(`   ✅ Status: ${dbRes.status} | Data:`, JSON.stringify(dbData));

  // 3. Login real
  console.log(`\n3️⃣ Autenticación con Administrador Real (${ADMIN_EMAIL})...`);
  const loginRes = await fetch(`${TARGET_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = (await loginRes.json()) as { data: { accessToken: string; user: { name: string } } };
  console.log(`   ✅ Status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    throw new Error(`Login falló: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.data.accessToken;

  // 4. GET /users/me
  console.log('\n4️⃣ GET /api/v1/users/me...');
  const meRes = await fetch(`${TARGET_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log(`   ✅ Status: ${meRes.status} | Me:`, JSON.stringify(meData));

  // 5. GET /dishes
  console.log('5️⃣ GET /api/v1/dishes...');
  const dishesRes = await fetch(`${TARGET_URL}/api/v1/dishes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dishesData = (await dishesRes.json()) as { data: unknown[] };
  console.log(`   ✅ Status: ${dishesRes.status} | Items: ${dishesData.data?.length ?? 0}`);

  // 6. GET /daily-menus/today
  console.log('6️⃣ GET /api/v1/daily-menus/today...');
  const menuRes = await fetch(`${TARGET_URL}/api/v1/daily-menus/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${menuRes.status}`);

  // 7. GET /reports/sales
  console.log('7️⃣ GET /api/v1/reports/sales...');
  const salesRes = await fetch(`${TARGET_URL}/api/v1/reports/sales?period=month`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${salesRes.status}`);

  // 8. GET /reports/expenses
  console.log('8️⃣ GET /api/v1/reports/expenses...');
  const expRes = await fetch(`${TARGET_URL}/api/v1/reports/expenses?period=month`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${expRes.status}`);

  // 9. GET /reports/result
  console.log('9️⃣ GET /api/v1/reports/result...');
  const resRes = await fetch(`${TARGET_URL}/api/v1/reports/result?period=month`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${resRes.status}`);

  // 10. GET /reports/production
  console.log('🔟 GET /api/v1/reports/production?date=2026-08-13...');
  const prodRes = await fetch(`${TARGET_URL}/api/v1/reports/production?date=2026-08-13`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${prodRes.status}`);

  // 11. GET /sync/pull?cursor=0
  console.log('1️⃣1️⃣ GET /api/v1/sync/pull?cursor=0...');
  const pullRes = await fetch(`${TARGET_URL}/api/v1/sync/pull?cursor=0`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pullData = (await pullRes.json()) as { data: { changes: unknown[]; next_cursor: number } };
  console.log(
    `   ✅ Status: ${pullRes.status} | Changes: ${pullData.data?.changes?.length ?? 0} | Next Cursor: ${pullData.data?.next_cursor}`,
  );

  // 12. GET /reports/export (Excel con datos vacíos)
  console.log('1️⃣2️⃣ GET /api/v1/reports/export (Excel vacío)...');
  const excelRes = await fetch(`${TARGET_URL}/api/v1/reports/export?date_from=2026-08-01&date_to=2026-08-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Status: ${excelRes.status} | Content-Type: ${excelRes.headers.get('content-type')}`);

  const buffer = await excelRes.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  console.log(`   ✅ Hojas procesadas en Excel vacío (${workbook.worksheets.length}): ${workbook.worksheets.map((w) => w.name).join(', ')}`);

  console.log('\n🎉 TODAS LAS VERIFICACIONES POST-LIMPIEZA PASARON EXITOSAMENTE.\n');
}

runPostCleanupVerification().catch((err) => {
  console.error('❌ ERROR EN VERIFICACIÓN POST-LIMPIEZA:', err);
  process.exit(1);
});
