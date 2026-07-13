import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Wallet } from '../../../db/db';

export const WalletService = {
  /**
   * Menambahkan dompet baru
   */
  async addWallet(name: string): Promise<void> {
    await db.wallets.add({
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    });
  },

  /**
   * Mengambil semua dompet
   */
  useWallets(): Wallet[] | undefined {
    return useLiveQuery(() => db.wallets.orderBy('createdAt').toArray());
  }
};
