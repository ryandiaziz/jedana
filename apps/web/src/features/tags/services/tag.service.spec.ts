import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';
import { TagService } from './tag.service';

describe('TagService', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  describe('updateTagName', () => {
    it('successfully updates tag name with trimmed text', async () => {
      await db.tags.add({
        id: 'tag-1',
        name: 'Belanja',
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const result = await TagService.updateTagName('tag-1', '  Belanja Bulanan  ');
      expect(result.success).toBe(true);

      const tag = await db.tags.get('tag-1');
      expect(tag?.name).toBe('Belanja Bulanan');
      expect(tag?.updatedAt).toBeGreaterThan(1000);
    });

    it('returns error when new name is empty or spaces only', async () => {
      await db.tags.add({
        id: 'tag-1',
        name: 'Makanan',
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const result = await TagService.updateTagName('tag-1', '   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tag name cannot be empty');

      const tag = await db.tags.get('tag-1');
      expect(tag?.name).toBe('Makanan');
    });

    it('rejects duplicate name existing on another tag (case-insensitive)', async () => {
      await db.tags.bulkAdd([
        { id: 'tag-1', name: 'Makanan', isArchived: false, createdAt: 1000, updatedAt: 1000 },
        { id: 'tag-2', name: 'Transportasi', isArchived: false, createdAt: 1000, updatedAt: 1000 },
      ]);

      const result = await TagService.updateTagName('tag-2', 'makanan');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tag name already in use, please choose another name');

      const tag2 = await db.tags.get('tag-2');
      expect(tag2?.name).toBe('Transportasi');
    });

    it('allows changing case on the same tag', async () => {
      await db.tags.add({
        id: 'tag-1',
        name: 'makanan',
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const result = await TagService.updateTagName('tag-1', 'Makanan');
      expect(result.success).toBe(true);

      const tag = await db.tags.get('tag-1');
      expect(tag?.name).toBe('Makanan');
    });
  });

  describe('deleteTag', () => {
    it('atomically deletes tag, transaction_tag links, and budgets associated with it', async () => {
      // Setup tag to delete and another tag to keep
      await db.tags.bulkAdd([
        { id: 'tag-delete', name: 'Delete Me', isArchived: false, createdAt: 1000, updatedAt: 1000 },
        { id: 'tag-keep', name: 'Keep Me', isArchived: false, createdAt: 1000, updatedAt: 1000 },
      ]);

      // Setup transaction_tags
      await db.transaction_tags.bulkAdd([
        { id: 'tt-1', transactionId: 'tx-1', tagId: 'tag-delete', createdAt: 1000 },
        { id: 'tt-2', transactionId: 'tx-2', tagId: 'tag-delete', createdAt: 1000 },
        { id: 'tt-3', transactionId: 'tx-3', tagId: 'tag-keep', createdAt: 1000 },
      ]);

      // Setup budgets
      await db.budgets.bulkAdd([
        { id: 'b-1', tagId: 'tag-delete', monthlyLimit: 500000, isDeleted: false, createdAt: 1000, updatedAt: 1000 },
        { id: 'b-2', tagId: 'tag-keep', monthlyLimit: 1000000, isDeleted: false, createdAt: 1000, updatedAt: 1000 },
      ]);

      // Execute delete
      await TagService.deleteTag('tag-delete');

      // Verify tag is deleted
      expect(await db.tags.get('tag-delete')).toBeUndefined();
      expect(await db.tags.get('tag-keep')).toBeDefined();

      // Verify transaction_tags were removed only for tag-delete
      const remainingLinks = await db.transaction_tags.toArray();
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].tagId).toBe('tag-keep');

      // Verify budgets were removed only for tag-delete
      const remainingBudgets = await db.budgets.toArray();
      expect(remainingBudgets).toHaveLength(1);
      expect(remainingBudgets[0].tagId).toBe('tag-keep');
    });
  });

  describe('archive and restore tag', () => {
    it('sets isArchived correctly', async () => {
      await db.tags.add({
        id: 'tag-1',
        name: 'Hobi',
        isArchived: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await TagService.archiveTag('tag-1');
      let tag = await db.tags.get('tag-1');
      expect(tag?.isArchived).toBe(true);

      await TagService.restoreTag('tag-1');
      tag = await db.tags.get('tag-1');
      expect(tag?.isArchived).toBe(false);
    });
  });
});
