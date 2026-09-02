import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  isRevoked: boolean;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  private hashKey(plainKey: string): string {
    return createHash('sha256').update(plainKey).digest('hex');
  }

  /**
   * Generate a new API key for a user.
   * Returns the plain key (shown once) and the stored record.
   */
  async generateKey(
    userId: string,
    name: string,
  ): Promise<{ plainKey: string; record: ApiKeyRecord }> {
    const randomPart = randomBytes(24).toString('base64url');
    const plainKey = `jdn_${randomPart}`;
    const keyHash = this.hashKey(plainKey);
    const keyPrefix = plainKey.substring(0, 8);

    const result = await this.pool.query<{
      id: string;
      name: string;
      key_prefix: string;
      last_used_at: string | null;
      created_at: string;
      is_revoked: boolean;
    }>(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, last_used_at, created_at, is_revoked`,
      [userId, name, keyHash, keyPrefix],
    );

    const row = result.rows[0];
    this.logger.log(`API key generated for user ${userId}: ${keyPrefix}...`);

    return {
      plainKey,
      record: {
        id: row.id,
        name: row.name,
        keyPrefix: row.key_prefix,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
        isRevoked: row.is_revoked,
      },
    };
  }

  /**
   * List all API keys for a user (without hashes).
   */
  async listKeys(userId: string): Promise<ApiKeyRecord[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      key_prefix: string;
      last_used_at: string | null;
      created_at: string;
      is_revoked: boolean;
    }>(
      `SELECT id, name, key_prefix, last_used_at, created_at, is_revoked
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      keyPrefix: row.key_prefix,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      isRevoked: row.is_revoked,
    }));
  }

  /**
   * Revoke an API key (soft delete).
   */
  async revokeKey(userId: string, keyId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE api_keys SET is_revoked = TRUE
       WHERE id = $1 AND user_id = $2 AND is_revoked = FALSE`,
      [keyId, userId],
    );

    if (result.rowCount === 0) {
      return false;
    }

    this.logger.log(`API key ${keyId} revoked for user ${userId}`);
    return true;
  }

  /**
   * Validate a plain API key and return the associated user.
   * Updates last_used_at timestamp.
   */
  async validateKey(
    plainKey: string,
  ): Promise<{ id: string; email: string } | null> {
    const keyHash = this.hashKey(plainKey);

    const result = await this.pool.query<{
      user_id: string;
      key_id: string;
    }>(
      `SELECT ak.id AS key_id, ak.user_id
       FROM api_keys ak
       WHERE ak.key_hash = $1 AND ak.is_revoked = FALSE`,
      [keyHash],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { user_id, key_id } = result.rows[0];

    // Update last_used_at (fire-and-forget for performance)
    this.pool
      .query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [key_id])
      .catch((err) => this.logger.error('Failed to update last_used_at', err));

    // Fetch user details
    const userResult = await this.pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE id = $1`,
      [user_id],
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    return userResult.rows[0];
  }
}
