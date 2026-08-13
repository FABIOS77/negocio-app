/**
 * scripts/test-remote-excel.ts
 *
 * Script de validación remota de descarga y estructura del archivo Excel (.xlsx) contra Render.
 */
import ExcelJS from 'exceljs';

const RENDER_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';

async function testRemoteExcelExport() {
  console.log(`📊 Probando exportación Excel (.xlsx) contra Render: ${RENDER_URL}\n`);

  // 1. Authenticate
  const loginRes = await fetch(`${RENDER_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@negocio.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login falló: ${JSON.stringify(loginData)}`);
  const token = loginData.data.accessToken;

  // 2. Request Excel Export
  console.log('1️⃣ Solicitando GET /api/v1/reports/export?date_from=2026-08-01&date_to=2026-08-31...');
  const res = await fetch(`${RENDER_URL}/api/v1/reports/export?date_from=2026-08-01&date_to=2026-08-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`   ✅ Status: ${res.status}`);
  console.log(`   ✅ Content-Type: ${res.headers.get('content-type')}`);
  console.log(`   ✅ Content-Disposition: ${res.headers.get('content-disposition')}`);

  if (res.status !== 200) {
    const errorText = await res.text();
    throw new Error(`Exportación falló con HTTP ${res.status}: ${errorText}`);
  }

  // 3. Load Buffer into ExcelJS Workbook
  const arrayBuffer = await res.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  console.log(`   ✅ Hojas encontradas (${sheetNames.length}):`, sheetNames.join(', '));

  if (sheetNames.length !== 4) {
    throw new Error(`Se esperaban 4 hojas pero se encontraron ${sheetNames.length}`);
  }

  // Validate Sheets
  const resumen = workbook.getWorksheet('Resumen');
  console.log(`   ✅ Hoja 'Resumen' filas: ${resumen?.rowCount} | Período: ${resumen?.getCell('B2').value}`);

  const pedidos = workbook.getWorksheet('Pedidos');
  console.log(`   ✅ Hoja 'Pedidos' filas: ${pedidos?.rowCount}`);

  const gastos = workbook.getWorksheet('Gastos');
  console.log(`   ✅ Hoja 'Gastos' filas: ${gastos?.rowCount}`);

  const platos = workbook.getWorksheet('Platos');
  console.log(`   ✅ Hoja 'Platos' filas: ${platos?.rowCount}`);

  console.log('\n🎉 EXPORTACIÓN EXCEL VALIDADA EXITOSAMENTE CONTRA RENDER.\n');
}

testRemoteExcelExport().catch((err) => {
  console.error('❌ Error en prueba remota de Excel:', err);
});
