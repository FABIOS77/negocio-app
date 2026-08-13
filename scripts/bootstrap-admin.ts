/**
 * scripts/bootstrap-admin.ts
 *
 * Herramienta CLI para la creación del usuario Administrador inicial de Producción.
 *
 * Variables de Entorno requeridas:
 * - BOOTSTRAP_ADMIN_NAME
 * - BOOTSTRAP_ADMIN_EMAIL
 * - BOOTSTRAP_ADMIN_PASSWORD
 * - BOOTSTRAP_CONFIRM=true
 *
 * Reglas de Seguridad:
 * - Nunca imprime ni guarda la contraseña plana.
 * - Utiliza Argon2id con parámetros recomendados de seguridad.
 * - Exige confirmación explícita mediante BOOTSTRAP_CONFIRM=true.
 * - Valida la fortaleza de la contraseña y formato de correo.
 * - Se ejecuta en una transacción Sequelize.
 */
import argon2 from 'argon2';
import crypto from 'crypto';
import { User } from '../src/modules/users/user.model';
import { sequelize } from '../src/database/sequelize';

export interface BootstrapAdminOptions {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export interface BootstrapAdminResult {
  id: string;
  name: string;
  email: string;
  active: boolean;
  version: number;
  createdAt: Date;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/;

export async function createProductionAdmin(
  options?: BootstrapAdminOptions,
): Promise<BootstrapAdminResult> {
  const name = options?.name ?? process.env['BOOTSTRAP_ADMIN_NAME'];
  const email = options?.email ?? process.env['BOOTSTRAP_ADMIN_EMAIL'];
  const password = options?.password ?? process.env['BOOTSTRAP_ADMIN_PASSWORD'];
  const confirm = options?.confirm ?? process.env['BOOTSTRAP_CONFIRM'];

  if (!confirm || confirm.trim() !== 'true') {
    throw new Error(
      'Creación cancelada: Se requiere BOOTSTRAP_CONFIRM=true para proceder con el bootstrap de producción.',
    );
  }

  if (!name || name.trim().length === 0) {
    throw new Error('BOOTSTRAP_ADMIN_NAME es requerido y no puede estar vacío.');
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL es requerido y debe tener un formato de correo válido.');
  }

  if (!password || !PASSWORD_REGEX.test(password)) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD es requerida (mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y símbolo especial @$!%*?&.#_-).',
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  // Verificar si ya existe el usuario
  const existingUser = await User.findOne({ where: { email: cleanEmail } });
  if (existingUser) {
    throw new Error(`El usuario con email "${cleanEmail}" ya existe en la base de datos.`);
  }

  // Generar hash Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const userId = crypto.randomUUID();

  // Crear usuario dentro de una transacción Sequelize
  const createdUser = await sequelize.transaction(async (t) => {
    return User.create(
      {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        active: true,
        version: 1,
      },
      { transaction: t },
    );
  });

  return {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    active: createdUser.active,
    version: createdUser.version,
    createdAt: createdUser.createdAt,
  };
}

// Ejecución CLI si se llama directamente
if (process.argv[1] && process.argv[1].includes('bootstrap-admin')) {
  (async () => {
    try {
      console.log('🔒 Iniciando Bootstrap de Usuario Administrador de Producción...\n');
      const result = await createProductionAdmin();
      console.log('✅ Usuario Administrador de Producción creado exitosamente:');
      console.log(`   - ID: ${result.id}`);
      console.log(`   - Nombre: ${result.name}`);
      console.log(`   - Email: ${result.email}`);
      console.log(`   - Estado: ${result.active ? 'ACTIVO' : 'INACTIVO'}`);
      const createdAtIso =
        result.createdAt instanceof Date
          ? result.createdAt.toISOString()
          : new Date(result.createdAt).toISOString();
      console.log(`   - Fecha Creación: ${createdAtIso}`);
      console.log('\n🔐 Recuerde resguardar las credenciales en su gestor de contraseñas.');
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ERROR DE BOOTSTRAP: ${msg}`);
      process.exit(1);
    }
  })();
}
