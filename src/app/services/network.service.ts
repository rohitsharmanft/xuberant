import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private isOnlineSubject = new BehaviorSubject<boolean>(true);
  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  constructor() {
    this.initNetworkListener();
  }

  private async initNetworkListener(): Promise<void> {
    // Set initial status
    const status = await Network.getStatus();
    this.isOnlineSubject.next(status.connected);

    // Listen for changes
    Network.addListener('networkStatusChange', (status) => {
      this.isOnlineSubject.next(status.connected);
    });
  }

  get isOnline(): boolean {
    return this.isOnlineSubject.getValue();
  }

  async checkConnectivity(): Promise<boolean> {
    const status = await Network.getStatus();
    this.isOnlineSubject.next(status.connected);
    return status.connected;
  }
}
