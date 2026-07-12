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
    columns: ['id', 'user_id', 'name', 'is_deleted', 'created_at', 'updated_at'],
    pullQuery: 'SELECT * FROM wallets WHERE user_id = $1 AND updated_at > $2'
  },
  transactions: {
    tableName: 'transactions',
    columns: ['id', 'user_id', 'wallet_id', 'type', 'amount', 'date', 'note', 'payee', 'is_deleted', 'created_at', 'updated_at'],
    pullQuery: 'SELECT * FROM transactions WHERE user_id = $1 AND updated_at > $2'
  },
  tags: {
    tableName: 'tags',
    columns: ['id', 'user_id', 'name', 'is_archived', 'is_deleted', 'created_at', 'updated_at'],
    pullQuery: 'SELECT * FROM tags WHERE user_id = $1 AND updated_at > $2'
  },
  transaction_tags: {
    tableName: 'transaction_tags',
    columns: ['id', 'transaction_id', 'tag_id', 'is_deleted', 'created_at', 'updated_at'],
    pullQuery: `
      SELECT tt.* FROM transaction_tags tt
      INNER JOIN transactions t ON t.id = tt.transaction_id
      WHERE t.user_id = $1 AND tt.updated_at > $2
    `
  }
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  // Helper to convert frontend Unix timestamp (ms) to JS Date for node-postgres
  private toDate(ms: number | undefined): Date {
    return ms ? new Date(ms) : new Date();
  }

  async push(userId: string, data: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, records] of Object.entries(data)) {
        const schema = SYNC_SCHEMA[key];
        if (!schema) {
          this.logger.warn(`No schema found for table key: ${key}`);
          continue;
        }

        if (Array.isArray(records) && records.length > 0) {
          for (const record of records) {
            // Build values array based on schema columns
            const values = schema.columns.map(col => {
              if (col === 'user_id') return userId;
              
              // map snake_case column back to camelCase to find in record
              const camelCol = col.replace(/_([a-z])/g, g => g[1].toUpperCase());
              let val = record[camelCol];
              
              if (val === undefined) {
                 if (col === 'is_deleted' || col === 'is_archived') val = false;
              }

              if (col === 'created_at' || col === 'updated_at') {
                return this.toDate(val);
              }
              return val !== undefined ? val : null;
            });

            const placeholders = schema.columns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Build ON CONFLICT UPDATE SET clauses (excluding id and user_id)
            const updateCols = schema.columns.filter(c => c !== 'id' && c !== 'user_id');
            const updateSet = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');

            const query = `
              INSERT INTO ${schema.tableName} (${schema.columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET
                ${updateSet}
              WHERE EXCLUDED.updated_at > ${schema.tableName}.updated_at
            `;

            await client.query(query, values);
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

  async pull(userId: string, lastSync: Date) {
    const dateParam = lastSync || new Date(0);
    const result: any = {};

    // Map DB snake_case back to camelCase for frontend
    const mapToCamelCase = (row: any) => {
      const newObj: any = {};
      for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        
        // node-postgres returns BIGINT and NUMERIC as strings. Convert them to numbers.
        if (camelKey === 'amount' || camelKey === 'date') {
           newObj[camelKey] = Number(row[key]);
        } else if (camelKey === 'createdAt' || camelKey === 'updatedAt') {
           // node-postgres returns Date objects for TIMESTAMP columns. Frontend expects numbers.
           newObj[camelKey] = row[key] ? new Date(row[key]).getTime() : undefined;
        } else {
           newObj[camelKey] = row[key];
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
