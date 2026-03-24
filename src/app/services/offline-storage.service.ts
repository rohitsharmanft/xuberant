import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface CachedRecord {
  id?: number;
  table_name: string;
  record_id: string;
  data: string; // JSON string
  synced_at: string;
  server_updated_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  action: 'POST' | 'PUT' | 'DELETE' | 'GET';
  endpoint: string;
  payload: string; // JSON string
  created_at: string;
  retry_count: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error_message?: string;
}

const DB_NAME = 'xuberant_offline';

const CREATE_CACHED_DATA_TABLE = `
  CREATE TABLE IF NOT EXISTS cached_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    server_updated_at TEXT,
    UNIQUE(table_name, record_id)
  );
`;

const CREATE_SYNC_QUEUE_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT
  );
`;

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private db: SQLiteDBConnection | null = null;
  private sqlite: SQLiteConnection | null = null;
  private useLocalStorage = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const platform = Capacitor.getPlatform();

    // Use localStorage fallback on web
    if (platform === 'web') {
      this.useLocalStorage = true;
      this.initLocalStorageSchema();
      this.initialized = true;
      return;
    }

    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      await this.db.execute(CREATE_CACHED_DATA_TABLE);
      await this.db.execute(CREATE_SYNC_QUEUE_TABLE);
      this.initialized = true;
    } catch (err) {
      console.warn('[OfflineStorage] SQLite init failed, falling back to localStorage:', err);
      this.useLocalStorage = true;
      this.initLocalStorageSchema();
      this.initialized = true;
    }
  }

  private initLocalStorageSchema(): void {
    if (!localStorage.getItem('cached_data')) {
      localStorage.setItem('cached_data', JSON.stringify([]));
    }
    if (!localStorage.getItem('sync_queue')) {
      localStorage.setItem('sync_queue', JSON.stringify([]));
    }
  }

  // ─── Cached Data ────────────────────────────────────────────────────────────

  async upsertCachedData(tableName: string, recordId: string, data: any): Promise<void> {
    const now = new Date().toISOString();
    const dataStr = JSON.stringify(data);

    if (this.useLocalStorage) {
      const records: CachedRecord[] = JSON.parse(localStorage.getItem('cached_data') || '[]');
      const idx = records.findIndex(r => r.table_name === tableName && r.record_id === recordId);
      const record: CachedRecord = { table_name: tableName, record_id: recordId, data: dataStr, synced_at: now };
      if (idx >= 0) {
        records[idx] = { ...records[idx], ...record };
      } else {
        records.push(record);
      }
      localStorage.setItem('cached_data', JSON.stringify(records));
      return;
    }

    await this.db!.run(
      `INSERT INTO cached_data (table_name, record_id, data, synced_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(table_name, record_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at`,
      [tableName, recordId, dataStr, now]
    );
  }

  async getCachedData(tableName: string, recordId?: string): Promise<any[]> {
    if (this.useLocalStorage) {
      const records: CachedRecord[] = JSON.parse(localStorage.getItem('cached_data') || '[]');
      const filtered = records.filter(r =>
        r.table_name === tableName && (!recordId || r.record_id === recordId)
      );
      return filtered.map(r => JSON.parse(r.data));
    }

    const query = recordId
      ? `SELECT data FROM cached_data WHERE table_name = ? AND record_id = ?`
      : `SELECT data FROM cached_data WHERE table_name = ?`;
    const params = recordId ? [tableName, recordId] : [tableName];
    const res = await this.db!.query(query, params);
    return (res.values || []).map((row: any) => JSON.parse(row.data));
  }

  async clearCachedTable(tableName: string): Promise<void> {
    if (this.useLocalStorage) {
      const records: CachedRecord[] = JSON.parse(localStorage.getItem('cached_data') || '[]');
      localStorage.setItem('cached_data', JSON.stringify(records.filter(r => r.table_name !== tableName)));
      return;
    }
    await this.db!.run(`DELETE FROM cached_data WHERE table_name = ?`, [tableName]);
  }

  // ─── Sync Queue ──────────────────────────────────────────────────────────────

  async addToQueue(action: SyncQueueItem['action'], endpoint: string, payload: any): Promise<void> {
    const item: SyncQueueItem = {
      action,
      endpoint,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    if (this.useLocalStorage) {
      const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      item.id = Date.now();
      queue.push(item);
      localStorage.setItem('sync_queue', JSON.stringify(queue));
      return;
    }

    await this.db!.run(
      `INSERT INTO sync_queue (action, endpoint, payload, created_at, retry_count, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.action, item.endpoint, item.payload, item.created_at, item.retry_count, item.status]
    );
  }

  async getPendingQueue(): Promise<SyncQueueItem[]> {
    if (this.useLocalStorage) {
      const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      return queue.filter(i => i.status === 'pending' && i.retry_count < 5);
    }

    const res = await this.db!.query(
      `SELECT * FROM sync_queue WHERE status = 'pending' AND retry_count < 5 ORDER BY created_at ASC`
    );
    return (res.values || []).map((row: any) => ({
      ...row,
      payload: row.payload
    }));
  }

  async updateQueueItem(id: number, status: SyncQueueItem['status'], retryCount: number, errorMessage?: string): Promise<void> {
    if (this.useLocalStorage) {
      const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      const idx = queue.findIndex(i => i.id === id);
      if (idx >= 0) {
        queue[idx].status = status;
        queue[idx].retry_count = retryCount;
        if (errorMessage) queue[idx].error_message = errorMessage;
      }
      localStorage.setItem('sync_queue', JSON.stringify(queue));
      return;
    }

    await this.db!.run(
      `UPDATE sync_queue SET status = ?, retry_count = ?, error_message = ? WHERE id = ?`,
      [status, retryCount, errorMessage || null, id]
    );
  }

  async removeCompletedQueue(): Promise<void> {
    if (this.useLocalStorage) {
      const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      localStorage.setItem('sync_queue', JSON.stringify(queue.filter(i => i.status !== 'completed')));
      return;
    }
    await this.db!.run(`DELETE FROM sync_queue WHERE status = 'completed'`);
  }

  async getQueueCount(): Promise<{ pending: number; failed: number }> {
    if (this.useLocalStorage) {
      const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      return {
        pending: queue.filter(i => i.status === 'pending').length,
        failed: queue.filter(i => i.status === 'failed').length
      };
    }

    const pendingRes = await this.db!.query(`SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'`);
    const failedRes = await this.db!.query(`SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'failed'`);
    return {
      pending: pendingRes.values?.[0]?.cnt || 0,
      failed: failedRes.values?.[0]?.cnt || 0
    };
  }
}
