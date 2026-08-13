/**
 * scripts/test-remote.ts
 *
 * Script de validación remota NO DESTRUCTIVA (Solo Lectura) contra Render.
 */
const RENDER_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';

async function runReadOnlyTests() {
  console.log(`🌐 Probando endpoints de solo lectura contra Render: ${RENDER_URL}\n`);

  let token = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function testEndpoint(name: string, method: string, path: string, body?: any, auth = true) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${RENDER_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({}));
      console.log(`[${res.status}] ${method} ${path} -> ${res.ok ? '✅ OK' : '❌ FAIL'}`);
      return { status: res.status, ok: res.ok, data: json };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[TIMEOUT/ERR] ${method} ${path} -> ❌ ${msg}`);
      return { status: 0, ok: false, data: null };
    }
  }

  // 1. GET /health
  console.log('1. Probando GET /health...');
  const h1 = await testEndpoint('Health Check', 'GET', '/health', null, false);
  if (!h1.ok) {
    console.log('   (Esperando a que el Web Service en Render termine de construir/despertar)...');
  }

  // 2. GET /health/db
  console.log('2. Probando GET /health/db...');
  const h2 = await testEndpoint('DB Health Check', 'GET', '/health/db', null, false);
  if (h2.data?.data) {
    console.log(`   Database Status: ${h2.data.data.database ?? 'ok'}`);
  }

  // 3. POST /api/v1/auth/login
  console.log('3. Probando POST /api/v1/auth/login...');
  const loginRes = await testEndpoint('Login', 'POST', '/api/v1/auth/login', {
    email: 'admin@negocio.com',
    password: 'Password123!',
  }, false);

  if (loginRes.ok && loginRes.data?.data?.accessToken) {
    token = loginRes.data.data.accessToken;
    console.log('   ✅ Token JWT obtenido');
  }

  // 4. GET /api/v1/users/me
  console.log('4. Probando GET /api/v1/users/me...');
  await testEndpoint('User Profile', 'GET', '/api/v1/users/me');

  // 5. GET /api/v1/dishes
  console.log('5. Probando GET /api/v1/dishes...');
  await testEndpoint('List Dishes', 'GET', '/api/v1/dishes');

  // 6. GET /api/v1/daily-menus/today
  console.log('6. Probando GET /api/v1/daily-menus/today...');
  await testEndpoint('Today Menu', 'GET', '/api/v1/daily-menus/today');

  // 7. GET /api/v1/reports/sales
  console.log('7. Probando GET /api/v1/reports/sales...');
  await testEndpoint('Sales Report', 'GET', '/api/v1/reports/sales?period=day');

  // 8. GET /api/v1/reports/expenses
  console.log('8. Probando GET /api/v1/reports/expenses...');
  await testEndpoint('Expenses Report', 'GET', '/api/v1/reports/expenses?period=day');

  // 9. GET /api/v1/reports/result
  console.log('9. Probando GET /api/v1/reports/result...');
  await testEndpoint('Financial Result', 'GET', '/api/v1/reports/result?period=day');

  // 10. GET /api/v1/reports/top-dishes
  console.log('10. Probando GET /api/v1/reports/top-dishes...');
  await testEndpoint('Top Dishes Report', 'GET', '/api/v1/reports/top-dishes?period=day');

  console.log('\n🎉 PRUEBAS REMOTAS CONCLUIDAS.\n');
}

runReadOnlyTests().catch((err) => {
  console.error('❌ Error ejecutando pruebas remotas:', err);
});
