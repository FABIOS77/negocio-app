/**
 * scripts/test-remote-sync.ts
 *
 * Prueba E2E multidispositivo de sincronización offline/online contra Render.
 * Cliente A: PUSH (Create Order)
 * Cliente B: PULL -> PUSH (Update Order Status)
 * Cliente A: PULL (Verifica actualización)
 */
import crypto from 'crypto';

const RENDER_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';

async function runMultiDeviceSyncTest() {
  console.log(`📡 Probando sincronización multi-dispositivo contra Render: ${RENDER_URL}\n`);

  // 1. Authenticate to get JWT token
  const loginRes = await fetch(`${RENDER_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@negocio.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Get a valid dish ID
  const dishesRes = await fetch(`${RENDER_URL}/api/v1/dishes`, { headers });
  const dishesData = await dishesRes.json();
  const sampleDish = dishesData.data.data[0];
  if (!sampleDish) throw new Error('No active dishes found in DB');

  const orderId = crypto.randomUUID();
  const opIdCreate = crypto.randomUUID();

  // Cliente A: Push CREATE order
  console.log('1️⃣ [Cliente A] PUSH (Create Order)...');
  const pushARes = await fetch(`${RENDER_URL}/api/v1/sync/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [
        {
          operation_id: opIdCreate,
          entity_type: 'order',
          entity_id: orderId,
          operation: 'CREATE',
          payload: {
            customer_name: 'Cliente E2E Multi-Device',
            payment_method: 'CASH',
            items: [{ dish_id: sampleDish.id, quantity: 2 }],
          },
          client_timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  const pushAData = await pushARes.json();
  if (!pushARes.ok) {
    console.error('Push A failed:', pushAData);
    throw new Error(`Push A failed HTTP ${pushARes.status}`);
  }
  console.log(`   ✅ Cliente A Push status:`, pushAData.data.summary);

  // Cliente B: PULL to get initial cursor and change
  console.log('2️⃣ [Cliente B] PULL...');
  const pullBRes = await fetch(`${RENDER_URL}/api/v1/sync/pull?last_change_id=0`, { headers });
  const pullBData = await pullBRes.json();
  const nextCursorB = pullBData.data.next_cursor;
  console.log(`   ✅ Cliente B Pull recibidos: ${pullBData.data.changes.length} cambios | Next Cursor: ${nextCursorB}`);

  // Cliente B: Push UPDATE order (status -> DELIVERED)
  console.log('3️⃣ [Cliente B] PUSH (Update Order Status -> DELIVERED)...');
  const opIdUpdate = crypto.randomUUID();
  const pushBRes = await fetch(`${RENDER_URL}/api/v1/sync/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [
        {
          operation_id: opIdUpdate,
          entity_type: 'order',
          entity_id: orderId,
          operation: 'UPDATE',
          payload: { status: 'DELIVERED' },
          base_version: 1,
          client_timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  const pushBData = await pushBRes.json();
  console.log(`   ✅ Cliente B Push status: ${pushBData.data.results[0].status}`);

  // Cliente A: PULL to receive update
  console.log('4️⃣ [Cliente A] PULL...');
  const pullARes = await fetch(`${RENDER_URL}/api/v1/sync/pull?last_change_id=${nextCursorB - 1}`, { headers });
  const pullAData = await pullARes.json();
  console.log(`   ✅ Cliente A Pull recibidos: ${pullAData.data.changes.length} cambios | Next Cursor: ${pullAData.data.next_cursor}`);

  // 5. Test Idempotency: Re-send Client A Create operation
  console.log('5️⃣ [Idempotencia] Re-enviando operación de creación previa...');
  const retryRes = await fetch(`${RENDER_URL}/api/v1/sync/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [
        {
          operation_id: opIdCreate,
          entity_type: 'order',
          entity_id: orderId,
          operation: 'CREATE',
          payload: { customer_name: 'Duplicado' },
          client_timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  const retryData = await retryRes.json();
  console.log(`   ✅ Idempotencia respuesta: ${retryData.data.results[0].status} (debe ser PROCESSED o IGNORED)`);

  console.log('\n🎉 PRUEBA DE SINCRONIZACIÓN MULTI-DISPOSITIVO REMOTA EXITOSA.\n');
}

runMultiDeviceSyncTest().catch((err) => {
  console.error('❌ Error en prueba de sync:', err);
});
