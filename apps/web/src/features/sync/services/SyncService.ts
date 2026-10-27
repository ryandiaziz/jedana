import { db } from '../../../db/db';

const PUSH_WATERMARK_KEY = 'jedana.lastPushAt';
const PULL_CURSOR_KEY = 'jedana.syncCursor';
const SYNC_DEBOUNCE_MS = 2000;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface SyncableRecord {
  updatedAt?: number;
}

class SyncEngine {
  private authenticated = false;
  private applyingRemote = false;
  private started = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;

  setAuthenticated(value: boolean) {
    this.authenticated = value;
  }

  /** Register hooks + listeners once. Safe to call repeatedly. */
  start() {
    if (this.started) return;
    this.started = true;

    // Any local write schedules a debounced sync. Remote writes are ignored.
    for (const table of db.tables) {
      const schedule = () => {
        if (!this.applyingRemote) this.scheduleSync();
      };
      table.hook('creating', schedule);
      table.hook('updating', schedule);
      table.hook('deleting', schedule);
    }

    window.addEventListener('online', () => this.scheduleSync(0));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.scheduleSync(0);
    });

    this.intervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.scheduleSync(0);
    }, SYNC_INTERVAL_MS);
  }

  stop() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.debounceTimer = null;
    this.intervalTimer = null;
    this.authenticated = false;
  }

  /** Forget both cursors. Call on logout together with wiping IndexedDB. */
  reset() {
    localStorage.removeItem(PUSH_WATERMARK_KEY);
    localStorage.removeItem(PULL_CURSOR_KEY);
  }

  scheduleSync(delay = SYNC_DEBOUNCE_MS) {
    if (!this.authenticated || !navigator.onLine) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.syncAll();
    }, delay);
  }

  async pushLocalChanges() {
    const watermark = Number(localStorage.getItem(PUSH_WATERMARK_KEY) ?? 0);
    const startedAt = Date.now();
    const payload: Record<string, unknown[]> = {};
    let hasData = false;

    for (const table of db.tables) {
      const rows = (await table.toArray()) as SyncableRecord[];
      const changed = rows.filter(
        (row) => row.updatedAt === undefined || row.updatedAt > watermark,
      );
      if (changed.length > 0) {
        payload[table.name] = changed;
        hasData = true;
      }
    }

    if (!hasData) return;

    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Failed to push data to server');
    }

    // Records changed during the push have updatedAt > startedAt and are
    // picked up by the next run.
    localStorage.setItem(PUSH_WATERMARK_KEY, String(startedAt));
  }

  async pullServerChanges() {
    const cursor = localStorage.getItem(PULL_CURSOR_KEY);
    const query = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
    const res = await fetch(`/api/sync/pull${query}`);

    if (!res.ok) {
      if (res.status === 401) return;
      throw new Error('Failed to pull data from server');
    }

    const data = (await res.json()) as Record<string, Record<string, unknown>[]>;

    this.applyingRemote = true;
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const [tableName, records] of Object.entries(data)) {
          if (!Array.isArray(records) || records.length === 0) continue;
          const table = db.table(tableName);
          if (!table) continue;

          for (const record of records) {
            const id = record.id as string;
            const local = await table.get(id);
            const localUpdated = (local as SyncableRecord | undefined)?.updatedAt ?? 0;
            const serverUpdated =
              (record.updatedAt as number | undefined) ?? Date.now();
            if (!local || serverUpdated >= localUpdated) {
              await table.put(record);
            }
          }
        }
      });
    } finally {
      this.applyingRemote = false;
    }

    const nextCursor = res.headers.get('X-Sync-Cursor');
    if (nextCursor) localStorage.setItem(PULL_CURSOR_KEY, nextCursor);
  }

  async syncAll() {
    if (this.inFlight) return this.inFlight;
    if (!this.authenticated || !navigator.onLine) return;

    this.inFlight = (async () => {
      try {
        await this.pushLocalChanges();
        await this.pullServerChanges();
        console.log('[SyncEngine] Sync completed successfully.');
      } catch (e) {
        console.error('[SyncEngine] Sync failed:', e);
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }
}

export const syncService = new SyncEngine();
