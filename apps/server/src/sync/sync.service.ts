import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface TableSchema {
  tableName: string;
  columns: string[];
  pullQuery: string;
}

const SYNC_SCHEMA: Record<string, TableSchema> = {
  wallets: {
    tableName: 'wallets',
    columns: [
      'id',
      'user_id',
      'name',
      'is_deleted',
      'created_at',
      'updated_at',
    ],
    pullQuery: 'SELECT * FROM wallets WHERE user_id = $1 AND updated_at > $2',
  },
  transactions: {
    tableName: 'transactions',
    columns: [
      'id',
      'user_id',
      'wallet_id',
      'type',
      'amount',
      'date',
      'note',
      'payee',
      'is_deleted',
      'created_at',
      'updated_at',
    ],
    pullQuery:
      'SELECT * FROM transactions WHERE user_id = $1 AND updated_at > $2',
  },
  tags: {
    tableName: 'tags',
    columns: [
      'id',
      'user_id',
      'name',
      'is_archived',
      'is_deleted',
      'created_at',
      'updated_at',
    ],
    pullQuery: 'SELECT * FROM tags WHERE user_id = $1 AND updated_at > $2',
  },
  transaction_tags: {
    tableName: 'transaction_tags',
    columns: [
      'id',
      'transaction_id',
      'tag_id',
      'is_deleted',
      'created_at',
      'updated_at',
    ],
    pullQuery: `
      SELECT tt.* FROM transaction_tags tt
      INNER JOIN transactions t ON t.id = tt.transaction_id
      WHERE t.user_id = $1 AND tt.updated_at > $2
    `,
  },
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  // Helper to convert frontend Unix timestamp (ms) to JS Date for node-postgres
  private toDate(ms: number | undefined): Date {
    return ms ? new Date(ms) : new Date();
  }

  async push(
    userId: string,
    data: Record<string, Array<Record<string, unknown>>>,
  ): Promise<{ success: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Process in dependency order: wallets -> tags -> transactions -> transaction_tags
      const tableOrder = [
        'wallets',
        'tags',
        'transactions',
        'transaction_tags',
      ];
      const sortedKeys = Object.keys(data).sort((a, b) => {
        const idxA = tableOrder.indexOf(a);
        const idxB = tableOrder.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      for (const key of sortedKeys) {
        const records = data[key];
        const schema = SYNC_SCHEMA[key];
        if (!schema) {
          this.logger.warn(`No schema found for table key: ${key}`);
          continue;
        }

        if (Array.isArray(records) && records.length > 0) {
          for (const record of records) {
            // ── Wallet Deduplication (Tombstone Pattern) ──
            if (key === 'wallets') {
              const isDel =
                record.isDeleted === true || record.is_deleted === true;
              const walletName =
                typeof record.name === 'string' ? record.name.trim() : '';
              const walletId = String(record.id);

              if (!isDel && walletName) {
                const existing = await client.query(
                  `SELECT id FROM wallets
                   WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE AND id != $3
                   LIMIT 1`,
                  [userId, walletName, walletId],
                );

                if (existing?.rows && existing.rows.length > 0) {
                  // Duplicate active wallet detected: persist client's ID as a tombstone
                  // so FK constraints hold and client receives isDeleted: true on next pull.
                  const now = this.toDate(
                    record.updatedAt as number | undefined,
                  );
                  const createdAt = this.toDate(
                    record.createdAt as number | undefined,
                  );
                  await client.query(
                    `INSERT INTO wallets (id, user_id, name, is_deleted, created_at, updated_at)
                     VALUES ($1, $2, $3, TRUE, $4, $5)
                     ON CONFLICT (id) DO UPDATE SET is_deleted = TRUE, updated_at = EXCLUDED.updated_at`,
                    [walletId, userId, walletName, createdAt, now],
                  );
                  continue;
                }
              }
            }

            // ── Stateless Transaction Validation & Remapping ──
            if (key === 'transactions') {
              const rawWalletId = record.walletId ?? record.wallet_id;
              const currentWalletId =
                typeof rawWalletId === 'string' ? rawWalletId : '';
              if (!currentWalletId) {
                throw new Error(
                  'Transaction validation error: walletId is required.',
                );
              }

              const targetWallet = await client.query<{
                id: string;
                name: string;
                is_deleted: boolean;
              }>(
                `SELECT id, name, is_deleted FROM wallets WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [currentWalletId, userId],
              );

              if (!targetWallet?.rows || targetWallet.rows.length === 0) {
                throw new Error(
                  `Transaction validation error: Target wallet ID "${currentWalletId}" does not exist.`,
                );
              }

              const walletRow = targetWallet.rows[0];
              if (walletRow.is_deleted) {
                // Target wallet is inactive (e.g. a tombstone from duplicate client wallet)
                // Statelessly search for the active canonical wallet with the same name.
                const activeWallet = await client.query<{ id: string }>(
                  `SELECT id FROM wallets
                   WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE
                   LIMIT 1`,
                  [userId, walletRow.name],
                );

                if (activeWallet?.rows && activeWallet.rows.length > 0) {
                  const canonicalId = activeWallet.rows[0].id;
                  if (record.walletId !== undefined)
                    record.walletId = canonicalId;
                  if (record.wallet_id !== undefined)
                    record.wallet_id = canonicalId;
                } else {
                  throw new Error(
                    `Transaction validation error: Target wallet "${walletRow.name}" (${currentWalletId}) is inactive and has no active canonical counterpart.`,
                  );
                }
              }
            }

            // Build values array based on schema columns
            const values = schema.columns.map((col) => {
              if (col === 'user_id') return userId;

              // map snake_case column back to camelCase to find in record
              const camelCol = col.replace(/_([a-z])/g, (g) =>
                g[1].toUpperCase(),
              );
              let val = record[camelCol];
              if (val === undefined && record[col] !== undefined) {
                val = record[col];
              }

              if (val === undefined) {
                if (col === 'is_deleted' || col === 'is_archived') val = false;
              }

              if (col === 'created_at' || col === 'updated_at') {
                return this.toDate(val as number | undefined);
              }
              return val !== undefined ? val : null;
            });

            const placeholders = schema.columns
              .map((_, i) => `$${i + 1}`)
              .join(', ');

            // Build ON CONFLICT UPDATE SET clauses (excluding id and user_id)
            const updateCols = schema.columns.filter(
              (c) => c !== 'id' && c !== 'user_id',
            );
            const updateSet = updateCols
              .map((c) => `${c} = EXCLUDED.${c}`)
              .join(', ');

            const query = `
              INSERT INTO ${schema.tableName} (${schema.columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET
                ${updateSet}
              WHERE EXCLUDED.updated_at > ${schema.tableName}.updated_at
            `;

            try {
              await client.query(query, values);
            } catch (err: unknown) {
              const pgErr = err as { code?: string };
              // Catch race-condition 23505 on wallets partial unique index
              if (key === 'wallets' && pgErr?.code === '23505') {
                const walletId = String(record.id);
                const walletName =
                  typeof record.name === 'string' ? record.name.trim() : '';
                const now = this.toDate(record.updatedAt as number | undefined);
                const createdAt = this.toDate(
                  record.createdAt as number | undefined,
                );
                await client.query(
                  `INSERT INTO wallets (id, user_id, name, is_deleted, created_at, updated_at)
                   VALUES ($1, $2, $3, TRUE, $4, $5)
                   ON CONFLICT (id) DO UPDATE SET is_deleted = TRUE, updated_at = EXCLUDED.updated_at`,
                  [walletId, userId, walletName, createdAt, now],
                );
              } else {
                throw err;
              }
            }
          }
        }
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (e) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to process push sync', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async pull(
    userId: string,
    lastSync: Date,
  ): Promise<Record<string, Array<Record<string, unknown>>>> {
    const dateParam = lastSync || new Date(0);
    const result: Record<string, Array<Record<string, unknown>>> = {};

    // Map DB snake_case back to camelCase for frontend
    const mapToCamelCase = (row: Record<string, unknown>) => {
      const newObj: Record<string, unknown> = {};
      for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

        // Convert null to undefined to prevent IndexedDB DataError on indexed fields
        const val = row[key] === null ? undefined : row[key];

        // node-postgres returns BIGINT and NUMERIC as strings. Convert them to numbers.
        if (camelKey === 'amount' || camelKey === 'date') {
          newObj[camelKey] = val !== undefined ? Number(val) : undefined;
        } else if (camelKey === 'createdAt' || camelKey === 'updatedAt') {
          // node-postgres returns Date objects for TIMESTAMP columns. Frontend expects numbers.
          newObj[camelKey] = val
            ? new Date(val as string | number | Date).getTime()
            : undefined;
        } else {
          newObj[camelKey] = val;
        }
      }
      return newObj;
    };

    for (const [key, schema] of Object.entries(SYNC_SCHEMA)) {
      const res = await this.pool.query(schema.pullQuery, [userId, dateParam]);
      result[key] = res.rows.map(mapToCamelCase);
    }

    return result;
  }
}
