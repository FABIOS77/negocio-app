/**
 * src/modules/auth/auth.service.ts
 *
 * Lógica de negocio de autenticación.
 *
 * Responsabilidades:
 * - Verificar credenciales (email + password Argon2id)
 * - Emitir access token JWT (15m) y refresh token (30d)
 * - Guardar hash del refresh token en BD (SHA-256)
 * - Renovar access token via refresh token válido
 * - Revocar refresh token en logout
 *
 * Reglas de seguridad:
 * - Nunca retornar password_hash
 * - El token real no se almacena; solo SHA-256(token)
 * - Respuesta de error idéntica para email inválido o password incorrecta
 *   (evitar enumeración de usuarios)
 */
import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../users/user.model';
import { RefreshToken } from './refresh-token.model';
import { env } from '../../config/env';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '../../utils/errors';
import type { LoginInput, RefreshInput, LogoutInput } from './auth.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera un SHA-256 del token real. Solo este hash se persiste. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Genera un token opaco aleatorio de 64 bytes (128 hex chars). */
function generateOpaqueToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/** Construye el access token JWT con payload mínimo. */
function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

/** Construye el objeto UserDTO seguro (sin password_hash). */
function toUserDTO(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function login(input: LoginInput) {
  // 1. Buscar usuario por email
  const user = await User.findOne({ where: { email: input.email } });

  // 2. Verificar password — mensaje idéntico para email o password incorrectos
  //    (prevenir enumeración de usuarios)
  const INVALID_CREDENTIALS = 'Invalid email or password';

  if (!user) {
    // Ejecutar un hash ficticio para evitar timing attacks
    await argon2.hash('dummy-timing-protection');
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    throw new AuthenticationError(INVALID_CREDENTIALS);
  }

  // 3. Verificar que el usuario esté activo
  if (!user.active) {
    throw new AuthorizationError('User account is inactive');
  }

  // 4. Emitir tokens
  const accessToken = signAccessToken(user.id);
  const refreshTokenRaw = generateOpaqueToken();
  const tokenHash = hashToken(refreshTokenRaw);

  // Calcular expiración (30d por defecto)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: toUserDTO(user),
  };
}

export async function refresh(input: RefreshInput) {
  const tokenHash = hashToken(input.refreshToken);

  // Buscar el token en BD
  const stored = await RefreshToken.findOne({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    include: [{ model: User, as: 'user' }],
  });

  if (!stored) {
    throw new AuthenticationError('Invalid, expired or revoked refresh token');
  }

  const user = stored.get('user') as User;

  if (!user || !user.active) {
    throw new AuthorizationError('User account is inactive');
  }

  const accessToken = signAccessToken(user.id);

  return { accessToken };
}

export async function logout(input: LogoutInput) {
  const tokenHash = hashToken(input.refreshToken);

  const stored = await RefreshToken.findOne({
    where: { tokenHash, revokedAt: null },
  });

  if (!stored) {
    // No lanzar error: logout idempotente
    return;
  }

  await stored.update({ revokedAt: new Date() });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user) throw new AuthenticationError('User not found');

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) throw new ValidationError('Current password is incorrect');

  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.update({ passwordHash: newHash, version: user.version + 1 });

  // Revocar todos los refresh tokens del usuario para forzar re-login en otros dispositivos
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } },
  );
}
