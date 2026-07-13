import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Tag } from '../../../db/db';

export const TagService = {
  /**
   * Mengambil seluruh tag yang pernah dibuat oleh pengguna (master data).
   */
  useAllTags(): Tag[] | undefined {
    return useLiveQuery(() => db.tags.orderBy('name').toArray());
  },

  /**
   * Mengambil tag yang diurutkan berdasarkan seberapa sering digunakan.
   */
  useFrequentTags(): Tag[] | undefined {
    return useLiveQuery(async () => {
      const allTags = await db.tags.toArray();
      const allLinks = await db.transaction_tags.toArray();
      
      const counts: Record<string, number> = {};
      allLinks.forEach(link => {
        counts[link.tagId] = (counts[link.tagId] || 0) + 1;
      });

      return allTags.sort((a, b) => {
        const countA = counts[a.id!] || 0;
        const countB = counts[b.id!] || 0;
        if (countB !== countA) return countB - countA; // Urutkan dari yang terbanyak
        return a.name.localeCompare(b.name); // Jika sama, urutkan abjad
      });
    });
  },

  /**
   * Mengarsipkan tag agar tidak muncul di pilihan form transaksi
   */
  async archiveTag(id: string): Promise<void> {
    await db.tags.update(id, { isArchived: true, updatedAt: Date.now() });
  },

  /**
   * Memulihkan tag dari arsip
   */
  async restoreTag(id: string): Promise<void> {
    await db.tags.update(id, { isArchived: false, updatedAt: Date.now() });
  }
};
