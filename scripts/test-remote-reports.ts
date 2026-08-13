/**
 * scripts/test-remote-reports.ts
 *
 * Script de validación remota de Reportes y Cálculos Financieros contra Render.
 */
const RENDER_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';

async function runReportTests() {
  console.log(`📊 Probando reportes y cálculos en Render: ${RENDER_URL}\n`);

  // Authenticate
  const loginRes = await fetch(`${RENDER_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@negocio.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.data) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginData)}`);
  }
  const token = loginData.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Sales Report
  console.log('1️⃣ [GET /reports/sales] Reporte de Ventas...');
  const salesRes = await fetch(`${RENDER_URL}/api/v1/reports/sales?period=day`, { headers });
  const salesData = await salesRes.json();
  console.log(`   ✅ Status: ${salesRes.status} | Total Ventas: ${salesData.data.total_sales} BOB | Pedidos: ${salesData.data.total_orders}`);

  // 2. Expenses Report
  console.log('2️⃣ [GET /reports/expenses] Reporte de Gastos...');
  const expRes = await fetch(`${RENDER_URL}/api/v1/reports/expenses?period=day`, { headers });
  const expData = await expRes.json();
  console.log(`   ✅ Status: ${expRes.status} | Total Gastos: ${expData.data.total_expenses} BOB | Registros: ${expData.data.expense_count}`);

  // 3. Result Report
  console.log('3️⃣ [GET /reports/result] Resultado Financiero...');
  const resRes = await fetch(`${RENDER_URL}/api/v1/reports/result?period=day`, { headers });
  const resData = await resRes.json();
  const { total_sales, total_expenses, result } = resData.data;
  console.log(`   ✅ Ventas: ${total_sales} BOB | Gastos: ${total_expenses} BOB | Neto (Result): ${result} BOB`);

  const expectedNet = Math.round((total_sales - total_expenses) * 100) / 100;
  if (result !== expectedNet) {
    throw new Error(`Cálculo neto incorrecto: ${result} vs ${expectedNet}`);
  }
  console.log('   ✅ Verificación de fórmula (result = total_sales - total_expenses): CORRECTO');

  // 4. Top Dishes Report
  console.log('4️⃣ [GET /reports/top-dishes] Top Platos Más Vendidos...');
  const topRes = await fetch(`${RENDER_URL}/api/v1/reports/top-dishes?period=day`, { headers });
  const topData = await topRes.json();
  console.log(`   ✅ Status: ${topRes.status} | Platos posicionados: ${topData.data.length}`);

  // 5. Production Report
  console.log('5️⃣ [GET /reports/production] Resumen de Producción...');
  const prodRes = await fetch(`${RENDER_URL}/api/v1/reports/production`, { headers });
  const prodData = await prodRes.json();
  console.log(`   ✅ Status: ${prodRes.status} | Platos a producir: ${prodData.data.dishes.length} tipos | Total Porciones: ${prodData.data.summary.totalItems}`);

  console.log('\n🎉 TODOS LOS REPORTES Y CÁLCULOS REMOTOS VERIFICADOS EXITOSAMENTE.\n');
}

runReportTests().catch((err) => {
  console.error('❌ Error en prueba de reportes:', err);
});
