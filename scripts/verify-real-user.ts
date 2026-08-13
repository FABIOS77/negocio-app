/**
 * scripts/verify-real-user.ts
 *
 * Script de validación de Login y Perfil del usuario Administrador real de Producción.
 */
import { app } from '../src/app';
import request from 'supertest';

async function verifyRealUser() {
  console.log('🔑 Probando autenticación del usuario Administrador real...\n');

  const email = process.env['BOOTSTRAP_ADMIN_EMAIL'] || 'grecia@negociokatering.com';
  const password = process.env['BOOTSTRAP_ADMIN_PASSWORD'] || 'GreciaKatering2026!';

  // 1. POST /api/v1/auth/login
  console.log(`1️⃣ Ejecutando POST /api/v1/auth/login con email: ${email}...`);
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  console.log(`   ✅ Login Status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    console.error('❌ Login falló:', loginRes.body);
    throw new Error(`Login falló con status ${loginRes.status}`);
  }

  const { accessToken, user } = loginRes.body.data;
  console.log(`   ✅ Access Token recibido. User ID: ${user.id}, Nombre: ${user.name}`);

  // 2. GET /api/v1/users/me
  console.log('\n2️⃣ Ejecutando GET /api/v1/users/me...');
  const meRes = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${accessToken}`);

  console.log(`   ✅ GET /users/me Status: ${meRes.status}`);
  if (meRes.status !== 200) {
    console.error('❌ GET /users/me falló:', meRes.body);
    throw new Error(`GET /users/me falló con status ${meRes.status}`);
  }

  console.log('   ✅ Perfil del Administrador real obtenido correctamente:');
  console.log(`      - ID: ${meRes.body.data.id}`);
  console.log(`      - Nombre: ${meRes.body.data.name}`);
  console.log(`      - Email: ${meRes.body.data.email}`);

  console.log('\n🎉 USUARIO ADMINISTRADOR REAL VERIFICADO EXITOSAMENTE.\n');
}

verifyRealUser().catch((err) => {
  console.error('❌ ERROR VERIFICANDO USUARIO REAL:', err);
  process.exit(1);
});
