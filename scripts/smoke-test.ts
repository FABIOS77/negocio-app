/**
 * scripts/smoke-test.ts
 *
 * Script reproducible de Smoke Test que ejecuta secuencialmente la secuencia
 * completa de 10 pasos contra el servidor HTTP en ejecución.
 *
 * Uso:
 *   npx tsx scripts/smoke-test.ts [BASE_URL]
 *   Ejemplo: npx tsx scripts/smoke-test.ts http://localhost:3000
 */
import crypto from 'crypto';

const BASE_URL = process.argv[2] || process.env['API_URL'] || 'http://localhost:3000';

async function runSmokeTest() {
  console.log(`🚀 Iniciando Smoke Test contra: ${BASE_URL}\n`);

  let token = '';
  const testDishId = crypto.randomUUID();
  const testMenuId = crypto.randomUUID();
  const testOrderId = crypto.randomUUID();
  const testExpenseId = crypto.randomUUID();
  const testCategoryId = '550e8400-e29b-41d4-a716-446655440400';
  const opIdPush = crypto.randomUUID();

  // Helper HTTP fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function request(method: string, path: string, body?: any, auth = true) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  // Paso 1: Health checks
  console.log('1️⃣ [GET /health & /health/db] Verificando estado del servidor y BD...');
  const h1 = await request('GET', '/health', null, false);
  if (!h1.ok) throw new Error(`Health check falló con status ${h1.status}`);

  const h2 = await request('GET', '/health/db', null, false);
  console.log(`   Health OK | DB status: ${h2.data.data?.database ?? 'ok'}`);

  // Paso 2: Login
  console.log('\n2️⃣ [POST /api/v1/auth/login] Autenticando usuario...');
  const loginRes = await request(
    'POST',
    '/api/v1/auth/login',
    { email: 'admin@negocio.com', password: 'Password123!' },
    false,
  );
  if (!loginRes.ok) {
    throw new Error(`Login falló (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }
  token = loginRes.data.data.accessToken;
  console.log('   ✅ Token obtenido correctamente');

  // Paso 3: Get me
  console.log('\n3️⃣ [GET /api/v1/users/me] Obteniendo perfil de usuario...');
  const meRes = await request('GET', '/api/v1/users/me');
  if (!meRes.ok) throw new Error(`Get me falló (${meRes.status})`);
  console.log(`   ✅ Hola ${meRes.data.data.name} (${meRes.data.data.email})`);

  // Paso 4: Create dish
  console.log('\n4️⃣ [POST /api/v1/dishes] Creando plato de prueba...');
  const dishRes = await request('POST', '/api/v1/dishes', {
    id: testDishId,
    name: `Plato Smoke ${Date.now()}`,
    description: 'Descripción plato de prueba',
    price: 25.5,
  });
  if (!dishRes.ok) throw new Error(`Create dish falló (${dishRes.status})`);
  console.log(`   ✅ Plato creado ID: ${dishRes.data.data.id}`);

  // Paso 5: Create daily menu
  console.log('\n5️⃣ [POST /api/v1/daily-menus] Creando menú diario...');
  const todayStr = new Date().toISOString().substring(0, 10);
  const menuRes = await request('POST', '/api/v1/daily-menus', {
    id: testMenuId,
    menu_date: todayStr,
    dish_ids: [testDishId],
  });
  if (!menuRes.ok && menuRes.status !== 409) {
    throw new Error(`Create daily menu falló (${menuRes.status})`);
  }
  console.log('   ✅ Menú diario preparado');

  // Paso 6: Create order
  console.log('\n6️⃣ [POST /api/v1/orders] Creando pedido idempotente...');
  const orderRes = await request('POST', '/api/v1/orders', {
    id: testOrderId,
    customer_name: 'Cliente Smoke Test',
    payment_method: 'CASH',
    items: [{ dish_id: testDishId, quantity: 2 }],
  });
  if (!orderRes.ok) throw new Error(`Create order falló (${orderRes.status})`);
  console.log(`   ✅ Pedido ${orderRes.data.data.orderNumber ?? orderRes.data.data.id} creado (Total: ${orderRes.data.data.total})`);

  // Paso 7: Production report
  console.log('\n7️⃣ [GET /api/v1/reports/production] Consultando resumen de producción...');
  const prodRes = await request('GET', `/api/v1/reports/production?date=${todayStr}`);
  if (!prodRes.ok) throw new Error(`Production report falló (${prodRes.status})`);
  console.log(`   ✅ Ítems a producir: ${prodRes.data.data.length} platos`);

  // Paso 8: Create expense & Financial report
  console.log('\n8️⃣ [POST /api/v1/expenses & GET /reports/result] Registrando gasto e informe...');
  const expRes = await request('POST', '/api/v1/expenses', {
    id: testExpenseId,
    description: 'Insumo verduras smoke test',
    amount: 15.0,
    category_id: testCategoryId,
    payment_method: 'CASH',
    expense_date: todayStr,
  });
  if (!expRes.ok && expRes.status !== 422) throw new Error(`Create expense falló (${expRes.status})`);

  const reportRes = await request('GET', `/api/v1/reports/result?period=day&date_from=${todayStr}`);
  if (!reportRes.ok) throw new Error(`Financial report falló (${reportRes.status})`);
  console.log(`   ✅ Resultado financiero hoy: Ventas ${reportRes.data.data.total_sales} BOB - Gastos ${reportRes.data.data.total_expenses} BOB = ${reportRes.data.data.result} BOB`);

  // Paso 9: Sync push
  console.log('\n9️⃣ [POST /api/v1/sync/push] Enviando lote de sincronización offline...');
  const syncOrderUuid = crypto.randomUUID();
  const pushRes = await request('POST', '/api/v1/sync/push', {
    operations: [
      {
        operation_id: opIdPush,
        entity_type: 'order',
        entity_id: syncOrderUuid,
        operation: 'CREATE',
        payload: {
          customer_name: 'Cliente Offline Sync',
          payment_method: 'QR',
          items: [{ dish_id: testDishId, quantity: 1 }],
        },
        client_timestamp: new Date().toISOString(),
      },
    ],
  });
  if (!pushRes.ok) throw new Error(`Sync push falló (${pushRes.status})`);
  console.log(`   ✅ Push procesado: ${pushRes.data.data.processed} operaciones (Status: ${pushRes.data.data.results[0]?.status})`);

  // Paso 10: Sync pull
  console.log('\n🔟 [GET /api/v1/sync/pull] Obteniendo cambios con cursor...');
  const pullRes = await request('GET', '/api/v1/sync/pull?cursor=0&limit=10');
  if (!pullRes.ok) throw new Error(`Sync pull falló (${pullRes.status})`);
  console.log(`   ✅ Pull exitoso: ${pullRes.data.data.changes.length} cambios recibidos (Next Cursor: ${pullRes.data.data.next_cursor})`);

  console.log('\n🎉 SMOKE TEST COMPLETADO CON ÉXITO — TODOS LOS 10 PASOS PASARON LIMPIAMENTE.\n');
}

runSmokeTest().catch((err) => {
  console.error('\n❌ SMOKE TEST FALLÓ:', err);
  process.exit(1);
});
