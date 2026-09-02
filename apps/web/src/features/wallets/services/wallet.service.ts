import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Wallet } from '../../../db/db';

export const WalletService = {
  /**
   * Menambahkan dompet baru
   */
  async addWallet(name: string): Promise<void> {
    const now = Date.now();
    await db.wallets.add({
      id: crypto.randomUUID(),
      name,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    });
  },

  /**
   * Mengambil semua dompet aktif
   */
  useWallets(): Wallet[] | undefined {
    return useLiveQuery(() =>
      db.wallets.filter((w) => !w.isDeleted).toArray()
    );
  }
};
