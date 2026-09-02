/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Migrasi untuk menegakkan keunikan nama wallet aktif per user.
 * 1. Menyatukan (merge) transaksi dari wallet duplikat ke wallet kanonik (terbaru/aktif).
 * 2. Menandai wallet duplikat sebagai is_deleted = TRUE.
 * 3. Menambahkan partial unique index (user_id, lower(name)) WHERE is_deleted = FALSE.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Deduplikasi & Penggabungan Transaksi:
    -- Cari duplikat aktif dan pilih kanonik (wallet dengan transaksi terbaru atau created_at terbaru)
    DO $$
    DECLARE
        r RECORD;
        canonical_id UUID;
        dup RECORD;
    BEGIN
        -- Iterasi setiap group (user_id, lower(name)) yang memiliki lebih dari 1 record aktif
        FOR r IN
            SELECT user_id, LOWER(name) AS lower_name
            FROM wallets
            WHERE is_deleted = FALSE
            GROUP BY user_id, LOWER(name)
            HAVING COUNT(*) > 1
        LOOP
            -- Pilih wallet kanonik: wallet yang memiliki transaksi terbaru, atau jika tidak ada transaksi, yang paling baru diupdate/dibuat
            SELECT w.id INTO canonical_id
            FROM wallets w
            LEFT JOIN transactions t ON t.wallet_id = w.id
            WHERE w.user_id = r.user_id AND LOWER(w.name) = r.lower_name AND w.is_deleted = FALSE
            GROUP BY w.id, w.created_at, w.updated_at
            ORDER BY MAX(t.created_at) DESC NULLS LAST, w.updated_at DESC, w.created_at DESC
            LIMIT 1;

            -- Untuk setiap wallet duplikat selain kanonik:
            FOR dup IN
                SELECT id
                FROM wallets
                WHERE user_id = r.user_id AND LOWER(name) = r.lower_name AND is_deleted = FALSE AND id != canonical_id
            LOOP
                -- Reassign semua transaksi ke wallet kanonik
                UPDATE transactions
                SET wallet_id = canonical_id
                WHERE wallet_id = dup.id;

                -- Mark wallet duplikat sebagai is_deleted = TRUE
                UPDATE wallets
                SET is_deleted = TRUE, updated_at = NOW()
                WHERE id = dup.id;
            END LOOP;
        END LOOP;
    END $$;

    -- 2. Buat Partial Unique Index
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_lower_name_active
      ON wallets(user_id, LOWER(name))
      WHERE is_deleted = FALSE;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_wallets_user_lower_name_active;
  `);
};
