/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Tambahkan kolom is_voided pada tabel transactions.
 * Kolom ini dipakai fitur void transaksi (MCP: void_transaction, dan query
 * laporan) — transaksi yang di-void tidak dihapus tapi tidak dihitung saldo.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS idx_transactions_is_voided
      ON transactions(is_voided);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_transactions_is_voided;
    ALTER TABLE transactions DROP COLUMN IF EXISTS is_voided;
  `);
};
