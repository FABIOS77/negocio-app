/**
 * src/modules/auth/refresh-token.model.ts
 *
 * Modelo Sequelize para la entidad RefreshToken.
 *
 * Notas importantes:
 * - token_hash almacena SHA-256(token_real). El token real NUNCA se persiste.
 * - Un usuario puede tener múltiples refresh tokens (múltiples dispositivos).
 * - revoked_at: null significa que el token está vigente.
 * - La relación con User se define en database/associations.ts
 */
import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  'id' | 'revokedAt' | 'createdAt' | 'updatedAt'
>;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /** Indica si el token ha sido revocado. */
  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /** Indica si el token ha expirado. */
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /** Indica si el token es válido (no revocado y no expirado). */
  get isValid(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'token_hash',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_refresh_tokens_user_id',
      },
      {
        fields: ['token_hash'],
        name: 'idx_refresh_tokens_token_hash',
      },
    ],
  },
);
