import { Injectable } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { LocationAccuracy } from '@awesome-cordova-plugins/location-accuracy/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';

export interface EnsureLocationOptions {
  /** Show an in-app explanation before OS permission / location request. */
  showRationale: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LocationPermissionService {
  /** Google Play "improve location accuracy" — only offer once per app session to avoid repeat prompts on every upload. */
  private androidHighAccuracyPromptShown = false;

  constructor(
    private platform: Platform,
    private alertController: AlertController,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private geolocation: Geolocation,
  ) {}

  private isHybrid(): boolean {
    return this.platform.is('capacitor') || this.platform.is('cordova');
  }

  /**
   * Called once the app is ready on device: requests location if not already allowed.
   */
  async promptOnLaunchIfNeeded(): Promise<void> {
    await this.platform.ready();
    if (!this.isHybrid()) {
      return;
    }
    const showRationale = this.platform.is('android');
    await this.ensureLocationAllowed({ showRationale });
  }

  /**
   * Ensures runtime location access where applicable; returns whether a position can be read.
   * Use before photo upload so coordinates are meaningful.
   */
  async ensureLocationAllowed(options: EnsureLocationOptions): Promise<boolean> {
    await this.platform.ready();
    if (!this.isHybrid()) {
      return true;
    }
    if (this.platform.is('android')) {
      return this.ensureAndroidLocation(options.showRationale);
    }
    return this.ensureIosLikeLocation(options.showRationale);
  }

  private async presentRationale(): Promise<boolean> {
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header: 'Location access',
          message:
            'This app uses your location to tag uploaded photos with the job site. Please allow location access when prompted.',
          backdropDismiss: false,
          buttons: [
            {
              text: 'Not now',
              role: 'cancel',
              handler: () => resolve(false),
            },
            {
              text: 'Continue',
              handler: () => resolve(true),
            },
          ],
        })
        .then((a) => {
          void a.present();
        });
    });
  }

  private async ensureAndroidLocation(showRationale: boolean): Promise<boolean> {
    // Fast path: works even when android-permissions checkPermission is flaky but OS already allowed location.
    if (await this.verifyCurrentPosition()) {
      return true;
    }

    let fine = await this.safeCheckFineLocation();
    if (!fine) {
      if (showRationale) {
        const go = await this.presentRationale();
        if (!go) {
          return false;
        }
      }
      fine = await this.requestAndroidLocationPermissions();
      if (!fine) {
        return false;
      }
    }

    if (await this.verifyCurrentPosition()) {
      return true;
    }

    if (!this.androidHighAccuracyPromptShown) {
      this.androidHighAccuracyPromptShown = true;
      await this.requestHighAccuracyIfPossible();
      if (await this.verifyCurrentPosition()) {
        return true;
      }
    }

    // Last resort: network / cached fix so indoor uploads are not blocked by strict GPS.
    return this.verifyRelaxedPosition();
  }

  private async safeCheckFineLocation(): Promise<boolean> {
    try {
      const r = await this.androidPermissions.checkPermission(
        this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION,
      );
      return r.hasPermission === true;
    } catch {
      return false;
    }
  }

  private async requestAndroidLocationPermissions(): Promise<boolean> {
    try {
      await this.androidPermissions.requestPermissions([
        this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION,
        this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION,
      ]);
    } catch {
      return false;
    }
    if (await this.safeCheckFineLocation()) {
      return true;
    }
    // Some Android/Capacitor builds still report false from checkPermission after the user allowed access.
    return this.verifyRelaxedPosition() || this.verifyCurrentPosition();
  }

  private async requestHighAccuracyIfPossible(): Promise<void> {
    try {
      const canRequest = await this.locationAccuracy.canRequest();
      if (canRequest) {
        await this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY);
      }
    } catch {
      // Optional on many devices; uploads can still use last known / coarse fix.
    }
  }

  private async ensureIosLikeLocation(showRationale: boolean): Promise<boolean> {
    // Upload always passed showRationale=true; only show our modal if a fix is not already available.
    if (await this.verifyCurrentPosition()) {
      return true;
    }
    if (showRationale) {
      const go = await this.presentRationale();
      if (!go) {
        return false;
      }
    }
    return this.verifyCurrentPosition();
  }

  private verifyCurrentPosition(): Promise<boolean> {
    return this.geolocation
      .getCurrentPosition({ timeout: 20000, enableHighAccuracy: true, maximumAge: 0 })
      .then(() => true)
      .catch(() => false);
  }

  private verifyRelaxedPosition(): Promise<boolean> {
    return this.geolocation
      .getCurrentPosition({ timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 })
      .then(() => true)
      .catch(() => false);
  }
}
