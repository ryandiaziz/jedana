import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';
import { syncService } from './SyncService';

describe('SyncEngine delta sync and cursors', () => {
  let storageStore: Record<string, string> = {};

  beforeEach(async () => {
    storageStore = {};
    const mockLocalStorage = new Proxy(storageStore, {
      get(target, prop: string) {
        if (prop === 'getItem') return (key: string) => target[key] ?? null;
        if (prop === 'setItem') return (key: string, val: unknown) => { target[key] = String(val); };
        if (prop === 'removeItem') return (key: string) => { delete target[key]; };
        if (prop === 'clear') return () => { for (const k in target) delete target[k]; };
        return target[prop] ?? null;
      },
      set(target, prop: string, value: unknown) {
        target[prop] = String(value);
        return true;
      },
      deleteProperty(target, prop: string) {
        delete target[prop];
        return true;
      },
    });

    vi.stubGlobal('localStorage', mockLocalStorage);
    await Promise.all(db.tables.map(table => table.clear()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not include records with updatedAt <= watermark in push payload', async () => {
    localStorage.setItem('jedana.lastPushAt', '1000');

    // Add an old record (updatedAt <= watermark)
    await db.wallets.put({
      id: 'w-old',
      name: 'Old Wallet',
      createdAt: 500,
      updatedAt: 1000,
      isDeleted: false,
    });

    let fetchCalled = false;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      fetchCalled = true;
      return { ok: true, json: async () => ({ success: true }) };
    }));

    await syncService.pushLocalChanges();

    expect(fetchCalled).toBe(false);
  });

  it('includes records with updatedAt > watermark and records without updatedAt in push payload', async () => {
    localStorage.setItem('jedana.lastPushAt', '1000');

    // Record with updatedAt > watermark
    await db.wallets.put({
      id: 'w-new',
      name: 'New Wallet',
      createdAt: 1000,
      updatedAt: 1500,
      isDeleted: false,
    });

    // Record without updatedAt
    await db.wallets.put({
      id: 'w-no-updated-at',
      name: 'No UpdatedAt Wallet',
      createdAt: 800,
      isDeleted: false,
    });

    // Record with updatedAt <= watermark (should be filtered out)
    await db.wallets.put({
      id: 'w-old',
      name: 'Old Wallet',
      createdAt: 500,
      updatedAt: 900,
      isDeleted: false,
    });

    let pushPayload: Record<string, Array<{ id: string }>> | null = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/sync/push') {
        pushPayload = JSON.parse(init?.body as string);
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false };
    }));

    await syncService.pushLocalChanges();

    expect(pushPayload).not.toBeNull();
    const walletIds = pushPayload?.wallets?.map(w => w.id);
    expect(walletIds).toContain('w-new');
    expect(walletIds).toContain('w-no-updated-at');
    expect(walletIds).not.toContain('w-old');
  });

  it('updates localStorage["jedana.lastPushAt"] after successful push', async () => {
    const initialWatermark = 1000;
    localStorage.setItem('jedana.lastPushAt', String(initialWatermark));

    await db.wallets.put({
      id: 'w-update',
      name: 'Update Wallet',
      createdAt: 1000,
      updatedAt: 1200,
      isDeleted: false,
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));

    await syncService.pushLocalChanges();

    const newWatermark = Number(localStorage.getItem('jedana.lastPushAt'));
    expect(newWatermark).toBeGreaterThan(initialWatermark);
    expect(Number(localStorage['jedana.lastPushAt'])).toBeGreaterThan(initialWatermark);
  });

  it('sends ?since=<cursor> and saves new X-Sync-Cursor on pullServerChanges', async () => {
    const initialCursor = '2026-02-01T12:00:00.000Z';
    const nextCursor = '2026-02-01T13:00:00.000Z';
    localStorage.setItem('jedana.syncCursor', initialCursor);

    let requestedUrl = '';
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      const headers = new Headers();
      headers.set('X-Sync-Cursor', nextCursor);
      return {
        ok: true,
        headers,
        json: async () => ({
          wallets: [
            {
              id: 'w-remote',
              name: 'Remote Wallet',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isDeleted: false,
            },
          ],
        }),
      };
    }));

    await syncService.pullServerChanges();

    expect(requestedUrl).toBe(`/api/sync/pull?since=${encodeURIComponent(initialCursor)}`);
    expect(localStorage.getItem('jedana.syncCursor')).toBe(nextCursor);

    const savedWallet = await db.wallets.get('w-remote');
    expect(savedWallet).toBeDefined();
    expect(savedWallet?.name).toBe('Remote Wallet');
  });

  it('removes both keys on reset()', () => {
    localStorage.setItem('jedana.lastPushAt', '123456');
    localStorage.setItem('jedana.syncCursor', '2026-02-01T12:00:00.000Z');

    expect(localStorage.getItem('jedana.lastPushAt')).toBe('123456');
    expect(localStorage.getItem('jedana.syncCursor')).toBe('2026-02-01T12:00:00.000Z');

    syncService.reset();

    expect(localStorage.getItem('jedana.lastPushAt')).toBeNull();
    expect(localStorage.getItem('jedana.syncCursor')).toBeNull();
  });
});
