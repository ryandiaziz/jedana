import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Tag } from '../../../db/db';

export const TagService = {
  /**
   * Fetch all tags created by the user (master data).
   */
  useAllTags(): Tag[] | undefined {
    return useLiveQuery(() => db.tags.orderBy('name').toArray());
  },

  /**
   * Fetch tags ordered by usage frequency.
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
        if (countB !== countA) return countB - countA; // Sort by highest frequency
        return a.name.localeCompare(b.name); // Alphabetical fallback
      });
    });
  },

  /**
   * Archive a tag so it does not appear in transaction form suggestions.
   */
  async archiveTag(id: string): Promise<void> {
    await db.tags.update(id, { isArchived: true, updatedAt: Date.now() });
  },

  /**
   * Restore a tag from the archive.
   */
  async restoreTag(id: string): Promise<void> {
    await db.tags.update(id, { isArchived: false, updatedAt: Date.now() });
  },

  /**
   * Update tag name with case-insensitive duplicate validation.
   */
  async updateTagName(id: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Tag name cannot be empty' };
    }

    // Check if another tag already uses this name (case-insensitive)
    const existing = await db.tags
      .where('name')
      .equalsIgnoreCase(trimmed)
      .filter(t => t.id !== id)
      .first();

    if (existing) {
      return { success: false, error: 'Tag name already in use, please choose another name' };
    }

    await db.tags.update(id, { name: trimmed, updatedAt: Date.now() });
    return { success: true };
  },

  /**
   * Permanently delete a tag, detach relations from all transactions,
   * and clean up any budgets linked to this tag.
   */
  async deleteTag(id: string): Promise<void> {
    await db.transaction('rw', [db.tags, db.transaction_tags, db.budgets], async () => {
      await db.tags.delete(id);
      await db.transaction_tags.where('tagId').equals(id).delete();
      await db.budgets.where('tagId').equals(id).delete();
    });
  }
};
