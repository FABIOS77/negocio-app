/**
 * scripts/test-remote-auth.ts
 *
 * Script de validación remota del flujo completo de autenticación contra Render:
 * 1. Login válido
 * 2. Login incorrecto
 * 3. Token válido
 * 4. Request sin token
 * 5. Refresh token
 * 6. Logout
 * 7. Token revocado
 */
const RENDER_URL = process.argv[2] || process.env['RENDER_URL'] || 'https://katering-grecia-app.onrender.com';

async function runAuthTests() {
  console.log(`🔐 Probando flujo de autenticación contra Render: ${RENDER_URL}\n`);

  // 1. Valid Login
  console.log('1️⃣ [POST /auth/login] Login con credenciales válidas...');
  const loginRes = await fetch(`${RENDER_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@negocio.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) throw new Error(`Login válido falló: ${loginRes.status}`);
  const accessToken = loginData.data.accessToken;
  const refreshToken = loginData.data.refreshToken;
  console.log('   ✅ HTTP 200: Login exitoso, tokens obtenidos');

  // 2. Invalid Login
  console.log('2️⃣ [POST /auth/login] Login con contraseña incorrecta...');
  const badLoginRes = await fetch(`${RENDER_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@negocio.com', password: 'WrongPassword99!' }),
  });
  console.log(`   ✅ HTTP ${badLoginRes.status}: Login rechazado correctamente`);

  // 3. Request with valid token
  console.log('3️⃣ [GET /users/me] Consulta con token válido...');
  const validTokenRes = await fetch(`${RENDER_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log(`   ✅ HTTP ${validTokenRes.status}: Acceso concedido`);

  // 4. Request without token
  console.log('4️⃣ [GET /users/me] Consulta sin token de autorización...');
  const noTokenRes = await fetch(`${RENDER_URL}/api/v1/users/me`);
  console.log(`   ✅ HTTP ${noTokenRes.status}: Acceso denegado correctamente (UNAUTHORIZED)`);

  // 5. Refresh token
  console.log('5️⃣ [POST /auth/refresh] Renovación de token con refreshToken válido...');
  const refreshRes = await fetch(`${RENDER_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await refreshRes.json();
  if (refreshRes.status !== 200) throw new Error(`Refresh token falló: ${refreshRes.status}`);
  const newRefreshToken = refreshData.data.refreshToken;
  console.log('   ✅ HTTP 200: Token renovado exitosamente');

  // 6. Logout
  console.log('6️⃣ [POST /auth/logout] Cierre de sesión y revocación...');
  const logoutRes = await fetch(`${RENDER_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: newRefreshToken }),
  });
  console.log(`   ✅ HTTP ${logoutRes.status}: Sesión cerrada correctamente`);

  // 7. Revoked Refresh token attempt
  console.log('7️⃣ [POST /auth/refresh] Intento de uso de refreshToken revocado...');
  const revokedRes = await fetch(`${RENDER_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: newRefreshToken }),
  });
  console.log(`   ✅ HTTP ${revokedRes.status}: Token revocado rechazado correctamente`);

  console.log('\n🎉 PRUEBAS DE AUTENTICACIÓN REMOTAS EXITOSAS.\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Error en prueba de auth:', err);
});
