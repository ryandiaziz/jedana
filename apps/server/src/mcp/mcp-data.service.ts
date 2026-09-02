import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// ──────────────────── Types ────────────────────

export interface CreateTransactionInput {
  walletId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  note: string;
  date?: number; // Unix timestamp ms, defaults to now
  payee?: string;
  tagIds?: string[];
}

export interface TransactionRecord {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  date: number;
  note: string;
  payee?: string;
  isVoided: boolean;
  createdAt: number;
}

export interface WalletRecord {
  id: string;
  name: string;
  balance: number;
  createdAt: number;
}

export interface TagRecord {
  id: string;
  name: string;
  isArchived: boolean;
}

export interface SummaryRecord {
  walletId: string;
  walletName: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

// ──────────────────── Service ────────────────────

@Injectable()
export class McpDataService {
  private readonly logger = new Logger(McpDataService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  // ──────────────── Transactions ────────────────

  async createTransaction(
    userId: string,
    input: CreateTransactionInput,
  ): Promise<TransactionRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const id = randomUUID();
      const now = new Date();
      // Kolom transactions.date bertipe BIGINT (Unix epoch ms) — kirim angka
      // langsung; jangan dibungkus Date (pg akan serialize jadi string ISO
      // dan PostgreSQL menolaknya untuk tipe bigint).
      const txDate = input.date ?? Date.now();

      await client.query(
        `INSERT INTO transactions (id, user_id, wallet_id, type, amount, date, note, payee, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $9)`,
        [
          id,
          userId,
          input.walletId,
          input.type,
          input.amount,
          txDate,
          input.note,
          input.payee || null,
          now,
        ],
      );

      // Link tags if provided
      if (input.tagIds && input.tagIds.length > 0) {
        for (const tagId of input.tagIds) {
          const ttId = randomUUID();
          await client.query(
            `INSERT INTO transaction_tags (id, transaction_id, tag_id, is_deleted, created_at, updated_at)
             VALUES ($1, $2, $3, FALSE, $4, $4)`,
            [ttId, id, tagId, now],
          );
        }
      }

      await client.query('COMMIT');

      return {
        id,
        walletId: input.walletId,
        type: input.type,
        amount: input.amount,
        date: txDate,
        note: input.note,
        payee: input.payee,
        isVoided: false,
        createdAt: now.getTime(),
      };
    } catch (e) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create transaction', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async listTransactions(
    userId: string,
    options: {
      walletId?: string;
      startDate?: number;
      endDate?: number;
      type?: 'INCOME' | 'EXPENSE';
      limit?: number;
    } = {},
  ): Promise<TransactionRecord[]> {
    const conditions = ['t.user_id = $1', 't.is_deleted = FALSE'];
    const params: unknown[] = [userId];
    let paramIdx = 2;

    if (options.walletId) {
      conditions.push(`t.wallet_id = $${paramIdx++}`);
      params.push(options.walletId);
    }
    if (options.type) {
      conditions.push(`t.type = $${paramIdx++}`);
      params.push(options.type);
    }
    if (options.startDate) {
      conditions.push(`t.date >= $${paramIdx++}`);
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`t.date <= $${paramIdx++}`);
      params.push(options.endDate);
    }

    const limit = Math.min(options.limit || 20, 100);
    conditions.push(`(t.is_voided IS NULL OR t.is_voided = FALSE)`);

    const query = `
      SELECT t.id, t.wallet_id, t.type, t.amount, t.date, t.note, t.payee,
             COALESCE(t.is_voided, FALSE) AS is_voided, t.created_at
      FROM transactions t
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit}
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      walletId: row.wallet_id,
      type: row.type,
      amount: Number(row.amount),
      // row.date: bigint epoch-ms dikembalikan pg sebagai string → Number(),
      // bukan new Date() (bigint ms tidak diparse jadi tanggal valid).
      date: Number(row.date),
      note: row.note,
      payee: row.payee || undefined,
      isVoided: row.is_voided,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  async voidTransaction(
    userId: string,
    transactionId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE transactions
       SET is_voided = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
      [transactionId, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  // ──────────────── Wallets ────────────────

  async listWallets(userId: string): Promise<WalletRecord[]> {
    const result = await this.pool.query(
      `SELECT
         w.id, w.name, w.created_at,
         COALESCE(SUM(
           CASE
             WHEN t.type = 'INCOME' AND (t.is_voided IS NULL OR t.is_voided = FALSE) AND t.is_deleted = FALSE THEN t.amount
             WHEN t.type = 'EXPENSE' AND (t.is_voided IS NULL OR t.is_voided = FALSE) AND t.is_deleted = FALSE THEN -t.amount
             ELSE 0
           END
         ), 0) AS balance
       FROM wallets w
       LEFT JOIN transactions t ON t.wallet_id = w.id AND t.user_id = w.user_id
       WHERE w.user_id = $1 AND w.is_deleted = FALSE
       GROUP BY w.id, w.name, w.created_at
       ORDER BY w.created_at ASC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      balance: Number(row.balance),
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  async createWallet(
    userId: string,
    name: string,
  ): Promise<{ id: string; name: string; isExisting?: boolean }> {
    const trimmed = name.trim();
    const existing = await this.pool.query(
      `SELECT id, name FROM wallets
       WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE
       LIMIT 1`,
      [userId, trimmed],
    );

    if (existing.rows.length > 0) {
      return {
        id: existing.rows[0].id,
        name: existing.rows[0].name,
        isExisting: true,
      };
    }

    const id = randomUUID();
    const now = new Date();

    try {
      await this.pool.query(
        `INSERT INTO wallets (id, user_id, name, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, FALSE, $4, $4)`,
        [id, userId, trimmed, now],
      );

      return { id, name: trimmed, isExisting: false };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === '23505') {
        const existingAgain = await this.pool.query(
          `SELECT id, name FROM wallets
           WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE
           LIMIT 1`,
          [userId, trimmed],
        );
        if (existingAgain.rows.length > 0) {
          return {
            id: existingAgain.rows[0].id,
            name: existingAgain.rows[0].name,
            isExisting: true,
          };
        }
      }
      throw err;
    }
  }

  // ──────────────── Tags ────────────────

  async listTags(
    userId: string,
    includeArchived = false,
  ): Promise<TagRecord[]> {
    const conditions = ['user_id = $1', 'is_deleted = FALSE'];
    if (!includeArchived) {
      conditions.push('is_archived = FALSE');
    }

    const result = await this.pool.query(
      `SELECT id, name, is_archived
       FROM tags
       WHERE ${conditions.join(' AND ')}
       ORDER BY name ASC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isArchived: row.is_archived,
    }));
  }

  async createTag(
    userId: string,
    name: string,
  ): Promise<{ id: string; name: string; isExisting?: boolean }> {
    const trimmed = name.trim();
    const existing = await this.pool.query(
      `SELECT id, name FROM tags
       WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE
       LIMIT 1`,
      [userId, trimmed],
    );

    if (existing.rows.length > 0) {
      return {
        id: existing.rows[0].id,
        name: existing.rows[0].name,
        isExisting: true,
      };
    }

    const id = randomUUID();
    const now = new Date();

    try {
      await this.pool.query(
        `INSERT INTO tags (id, user_id, name, is_archived, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, FALSE, FALSE, $4, $4)`,
        [id, userId, trimmed, now],
      );

      return { id, name: trimmed, isExisting: false };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === '23505') {
        const existingAgain = await this.pool.query(
          `SELECT id, name FROM tags
           WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND is_deleted = FALSE
           LIMIT 1`,
          [userId, trimmed],
        );
        if (existingAgain.rows.length > 0) {
          return {
            id: existingAgain.rows[0].id,
            name: existingAgain.rows[0].name,
            isExisting: true,
          };
        }
      }
      throw err;
    }
  }

  // ──────────────── Summary ────────────────

  async getSummary(
    userId: string,
    options: { walletId?: string; startDate?: number; endDate?: number } = {},
  ): Promise<SummaryRecord[]> {
    const conditions = [
      'w.user_id = $1',
      'w.is_deleted = FALSE',
      't.is_deleted = FALSE',
      '(t.is_voided IS NULL OR t.is_voided = FALSE)',
    ];
    const params: unknown[] = [userId];
    let paramIdx = 2;

    if (options.walletId) {
      conditions.push(`w.id = $${paramIdx++}`);
      params.push(options.walletId);
    }
    if (options.startDate) {
      conditions.push(`t.date >= $${paramIdx++}`);
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`t.date <= $${paramIdx++}`);
      params.push(options.endDate);
    }

    const query = `
      SELECT
        w.id AS wallet_id,
        w.name AS wallet_name,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(
          CASE
            WHEN t.type = 'INCOME' THEN t.amount
            WHEN t.type = 'EXPENSE' THEN -t.amount
            ELSE 0
          END
        ), 0) AS balance,
        COUNT(t.id) AS transaction_count
      FROM wallets w
      LEFT JOIN transactions t ON t.wallet_id = w.id AND t.user_id = w.user_id
        AND t.is_deleted = FALSE AND (t.is_voided IS NULL OR t.is_voided = FALSE)
        ${options.startDate ? `AND t.date >= $${paramIdx - (options.endDate ? 2 : 1)}` : ''}
        ${options.endDate ? `AND t.date <= $${paramIdx - 1}` : ''}
      WHERE w.user_id = $1 AND w.is_deleted = FALSE
        ${options.walletId ? `AND w.id = $2` : ''}
      GROUP BY w.id, w.name
      ORDER BY w.name ASC
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      walletId: row.wallet_id,
      walletName: row.wallet_name,
      totalIncome: Number(row.total_income),
      totalExpense: Number(row.total_expense),
      balance: Number(row.balance),
      transactionCount: Number(row.transaction_count),
    }));
  }
}
