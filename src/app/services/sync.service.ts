import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { NetworkService } from './network.service';
import { OfflineStorageService, SyncQueueItem } from './offline-storage.service';
import { GlobalConstants } from '../../common/global-constants';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
}

const MAX_RETRY = 5;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 32000];

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncStateSubject = new BehaviorSubject<SyncState>({
    status: 'idle',
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null
  });
  public syncState$: Observable<SyncState> = this.syncStateSubject.asObservable();

  private isSyncing = false;

  constructor(
    private http: HttpClient,
    private networkService: NetworkService,
    private storage: OfflineStorageService,
    private toastCtrl: ToastController
  ) {}

  /**
   * Call once on app startup: initialise DB, fetch remote data, wire up
   * network listener so queue is processed whenever connectivity returns.
   */
  async initialize(): Promise<void> {
    await this.storage.init();
    await this.refreshSyncState();

    // Subscribe to network changes
    this.networkService.isOnline$.subscribe(async (online) => {
      if (online) {
        await this.onCameOnline();
      } else {
        this.updateStatus('offline');
      }
    });

    // Initial fetch if online
    if (this.networkService.isOnline) {
      await this.fetchAndCacheServerData();
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Execute an API write action.
   * - Online → call immediately, on failure queue it.
   * - Offline → queue it.
   */
  async executeAction(
    action: SyncQueueItem['action'],
    endpoint: string,
    payload: any,
    headers?: Record<string, string>
  ): Promise<any> {
    if (this.networkService.isOnline) {
      try {
        const result = await this.callApi(action, endpoint, payload, headers);
        return result;
      } catch (err) {
        // Network error while online – queue for retry
        await this.storage.addToQueue(action, endpoint, { payload, headers });
        await this.refreshSyncState();
        await this.showToast('Action queued – will retry when reconnected', 'warning');
        throw err;
      }
    } else {
      await this.storage.addToQueue(action, endpoint, { payload, headers });
      await this.refreshSyncState();
      await this.showToast('Offline – action saved, will sync when connected', 'warning');
      return null;
    }
  }

  /**
   * Fetch and cache the primary data sets from the server.
   * Called on startup (if online) and after reconnect.
   */
  async fetchAndCacheServerData(): Promise<void> {
    const auth = this.getAuthHeader();
    if (!auth) return;

    this.updateStatus('syncing');

    try {
      // Fetch site list
      const sites: any = await firstValueFrom(
        this.http.get(GlobalConstants.sitelist, { headers: auth })
      );
      if (sites?.data) {
        await this.storage.clearCachedTable('sites');
        for (const site of sites.data) {
          await this.storage.upsertCachedData('sites', String(site.id || site.site_id), site);
        }
      }

      this.syncStateSubject.next({
        ...this.syncStateSubject.getValue(),
        status: 'idle',
        lastSyncedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Sync] fetchAndCacheServerData failed:', err);
      this.updateStatus('error');
    }
  }

  /**
   * Read cached data for a given table (used by components when offline).
   */
  async getCached(tableName: string, recordId?: string): Promise<any[]> {
    return this.storage.getCachedData(tableName, recordId);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async onCameOnline(): Promise<void> {
    await this.showToast('Back online – syncing pending changes…', 'success');
    await this.fetchAndCacheServerData();
    await this.processSyncQueue();
  }

  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatus('syncing');

    const queue = await this.storage.getPendingQueue();

    for (const item of queue) {
      let success = false;
      let lastError = '';

      for (let attempt = item.retry_count; attempt < MAX_RETRY; attempt++) {
        try {
          const body = JSON.parse(item.payload);
          await this.callApi(item.action, item.endpoint, body.payload, body.headers);
          await this.storage.updateQueueItem(item.id!, 'completed', attempt + 1);
          success = true;
          break;
        } catch (err: any) {
          lastError = err?.message || 'Unknown error';
          const delay = RETRY_DELAYS_MS[attempt] ?? 32000;
          await this.storage.updateQueueItem(item.id!, 'pending', attempt + 1, lastError);

          if (attempt < MAX_RETRY - 1) {
            await this.wait(delay);
          }

          // If we went offline during retry, stop processing
          if (!this.networkService.isOnline) break;
        }
      }

      if (!success) {
        await this.storage.updateQueueItem(item.id!, 'failed', MAX_RETRY, lastError);
      }
    }

    await this.storage.removeCompletedQueue();
    await this.refreshSyncState();

    const counts = await this.storage.getQueueCount();
    if (counts.failed > 0) {
      await this.showToast(`${counts.failed} action(s) failed to sync – tap to retry`, 'danger');
      this.updateStatus('error');
    } else {
      this.updateStatus('idle');
    }

    this.isSyncing = false;
  }

  private async callApi(
    action: SyncQueueItem['action'],
    endpoint: string,
    payload: any,
    extraHeaders?: Record<string, string>
  ): Promise<any> {
    const authHeader = this.getAuthHeader();
    const headers = new HttpHeaders({ ...(authHeader || {}), ...(extraHeaders || {}) });

    switch (action) {
      case 'POST':
        return firstValueFrom(this.http.post(endpoint, payload, { headers }));
      case 'PUT':
        return firstValueFrom(this.http.put(endpoint, payload, { headers }));
      case 'DELETE':
        return firstValueFrom(this.http.delete(endpoint, { headers }));
      case 'GET':
        return firstValueFrom(this.http.get(endpoint, { headers }));
    }
  }

  private getAuthHeader(): Record<string, string> | null {
    try {
      const raw = localStorage.getItem('authlogin');
      if (!raw) return null;
      const auth = JSON.parse(raw);
      if (auth?.token) {
        return { Authorization: `Bearer ${auth.token}` };
      }
      return {};
    } catch {
      return null;
    }
  }

  private async refreshSyncState(): Promise<void> {
    const counts = await this.storage.getQueueCount();
    this.syncStateSubject.next({
      ...this.syncStateSubject.getValue(),
      pendingCount: counts.pending,
      failedCount: counts.failed
    });
  }

  private updateStatus(status: SyncStatus): void {
    this.syncStateSubject.next({ ...this.syncStateSubject.getValue(), status });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
