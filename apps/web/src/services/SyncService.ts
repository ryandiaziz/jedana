import { db } from '../db/db';

class SyncEngine {
  async pushLocalChanges() {
    // 1. Gather all local data
    const payload: Record<string, any[]> = {};
    let hasData = false;

    for (const table of db.tables) {
      const records = await table.toArray();
      if (records.length > 0) hasData = true;
      payload[table.name] = records;
    }

    // 2. Push to server
    if (!hasData) {
      return; // nothing to push
    }

    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Failed to push data to server');
    }
  }

  async pullServerChanges() {
    // Determine last sync time (for simplicity, we pull everything for now, but production should store lastSync in localStorage)
    const lastSync = localStorage.getItem('lastSyncTime') || '';
    const query = lastSync ? `?lastSync=${encodeURIComponent(lastSync)}` : '';
    
    const res = await fetch(`/api/sync/pull${query}`);
    
    if (!res.ok) {
      if (res.status === 401) {
        // Not logged in, skip sync
        return;
      }
      throw new Error('Failed to pull data from server');
    }

    const data = await res.json();

    // Dexie's bulkPut handles UPSERT based on primary key (id)
    // However, to strictly respect LWW, we only overwrite if server's updated_at > local updated_at.
    
    await db.transaction('rw', db.tables, async () => {
      for (const [tableName, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;
        
        const table = db.table(tableName);
        if (!table) continue;

        for (const record of records) {
          const local = await table.get(record.id);
          if (!local || new Date(record.updatedAt) >= new Date(local.updatedAt)) {
            await table.put(record);
          }
        }
      }
    });

    localStorage.setItem('lastSyncTime', new Date().toISOString());
  }

  async syncAll() {
    try {
      // 1. Push local changes up
      await this.pushLocalChanges();
      // 2. Pull server changes down
      await this.pullServerChanges();
      console.log('[SyncEngine] Sync completed successfully.');
    } catch (e) {
      console.error('[SyncEngine] Sync failed:', e);
    }
  }
}

export const syncService = new SyncEngine();
