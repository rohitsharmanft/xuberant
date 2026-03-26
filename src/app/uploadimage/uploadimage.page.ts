import { Component, NgZone, OnInit } from '@angular/core';
import { Router,ActivatedRoute  } from '@angular/router'
import { PhotoService } from  '../services/photo.service';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ActionSheetController,ToastController,AlertController,LoadingController  } from '@ionic/angular';
import{ GlobalConstants } from '../../common/global-constants';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { LocationPermissionService } from '../services/location-permission.service';

@Component({
  selector: 'app-uploadimage',
  templateUrl: './uploadimage.page.html',
  styleUrls: ['./uploadimage.page.scss'],
})
export class UploadimagePage implements OnInit {
  pennelinfo: any = ''
   //image to be displayed in template
   image: any;
   imageData: any;
   latitude: any = 0; //latitude
   longitude: any = 0; //longitude
   clickedImage: string;
  imagelist: Array<{ src: string; name?: string }> = []
  queuedTotalsByStep: Array<{ stepId: string; count: number }> = [];
  queuedTotalAllSteps = 0;
   pathimg = GlobalConstants.pathimg
   activeStep: any
   private lastCoordsAt = 0;
   private readonly coordsCacheMs = 2 * 60 * 1000; // reuse coordinates for 2 minutes
   private readonly allowedImageTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
   ]);
  private readonly maxImageBytes = 100 * 1024; // 100KB
  private readonly maxDimension = 900; // downscale large photos for speed + size
  private readonly jpegBlobTimeoutMs = 8000; // avoid hanging toBlob calls
  private readonly geolocationTimeoutMs = 10000;
  private readonly perImageTimeoutMs = 25000;
  private readonly storageDecodeTimeoutMs = 15000; // avoid hanging on some device WebViews
  private readonly storageMaxDimension = 450;
  private readonly storageMaxBytes = 850 * 1024; // per-image Base64 size guard
  private readonly storageQualityCandidates = [0.18];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private photoService: PhotoService,
    private http: HttpClient,
    public actionSheetController: ActionSheetController,
    public toastController: ToastController,
    public alertController: AlertController,
    public loadingController: LoadingController,
    private geolocation: Geolocation,
    private ngZone: NgZone,
    private locationPermission: LocationPermissionService,
  ) {}

  ngOnInit() {
    if (localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null) {
      this.router.navigate(['/home']);
    }
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'));

    this.activatedRoute.queryParams.subscribe((params) => {
      console.log(params.activeid);
      this.activeStep = params.activeid;
      void this.hydratePendingImagesPreview();
      void this.hydratePendingTotals();
    });

    void this.refreshCoords();
  }

  /**
   * Cordova geolocation only works on native builds with the plugin; browser / ionic serve needs navigator.geolocation.
   */
  private async refreshCoords(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.lastCoordsAt && now - this.lastCoordsAt < this.coordsCacheMs) {
      return;
    }
    try {
      const resp = await this.withTimeout(
        this.geolocation.getCurrentPosition(),
        this.geolocationTimeoutMs,
      );
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
      this.lastCoordsAt = Date.now();
      return;
    } catch (e) {
      console.log('Cordova geolocation not available or denied, trying browser API', e);
    }
    await this.browserGeolocation();
  }

  private browserGeolocation(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.ngZone.run(() => {
            this.latitude = pos.coords.latitude;
            this.longitude = pos.coords.longitude;
            this.lastCoordsAt = Date.now();
          });
          resolve();
        },
        (err) => {
          console.log('Browser geolocation error', err);
          resolve();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
      );
    });
  }
 

  async onGalleryChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const picked = input.files;
    if (!picked?.length) {
      return;
    }
    const list = Array.from(picked);
    const validFiles = list.filter((file) => this.isSupportedImage(file));
    if (!validFiles.length) {
      await this.presentToast('Only JPG/JPEG and PNG images are allowed.');
      input.value = '';
      return;
    }
    if (validFiles.length !== list.length) {
      await this.presentToast('Some files were skipped. Allowed: JPG/JPEG and PNG.');
    }
    input.value = '';
    await this.uploadGalleryFiles(validFiles);
  }

  private isSupportedImage(file: File): boolean {
    if (!file?.type) {
      return false;
    }
    return this.allowedImageTypes.has(file.type.toLowerCase());
  }

  private getPendingQueueKey(): string {
    const panelId = this.pennelinfo?.id;
    const stepId = this.activeStep ?? '';

    // activeStep is required to keep images for the correct workflow step.
    if (!panelId || stepId === '' || stepId === null || stepId === undefined) {
      return '';
    }
    return `pendingImages:${panelId}:${stepId}`;
  }

  private readPendingQueue(queueKey: string): any | null {
    if (!queueKey) return null;
    try {
      const raw = localStorage.getItem(queueKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private estimateBytesFromDataUrl(dataUrl: string): number {
    // dataUrl = "data:<mime>;base64,<payload>"
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    // Base64 expands data by ~4/3; reverse it.
    return Math.floor((base64.length * 3) / 4);
  }

  private async fileToDownscaledJpegDataUrlForStorage(file: File): Promise<string> {
    try {
      // Some devices hang on decoding for very large images; time-bound the decode.
      const t0 = Date.now();
      const img: any = await this.withTimeout(this.loadImageBitmap(file), this.storageDecodeTimeoutMs);
      const t1 = Date.now();
      const originalW = img?.naturalWidth || img?.width;
      const originalH = img?.naturalHeight || img?.height;
      if (!originalW || !originalH) {
        throw new Error('Invalid image dimensions');
      }

      const largestSide = Math.max(originalW, originalH);
      const scale = largestSide > this.storageMaxDimension ? this.storageMaxDimension / largestSide : 1;
      const targetW = Math.max(1, Math.round(originalW * scale));
      const targetH = Math.max(1, Math.round(originalH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2d context not available');
      }

      // JPEG has no alpha; fill background so it doesn't look dark.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Use a single attempt first (much faster on devices).
      // If it is still over quota, we will throw and the caller will treat it as a save failure.
      const q = this.storageQualityCandidates[this.storageQualityCandidates.length - 1];
      const t2 = Date.now();
      const dataUrl = canvas.toDataURL('image/jpeg', q);
      const t3 = Date.now();
      const totalMs = t3 - t0;
      // Avoid console spam; only log slow ones.
      if (totalMs > 3000) {
        console.log('Downscale timings (ms)', {
          totalMs,
          decodeMs: t1 - t0,
          encodeMs: t3 - t2,
          originalW,
          originalH,
          targetW,
          targetH,
        });
      }
      if (this.estimateBytesFromDataUrl(dataUrl) > this.storageMaxBytes) {
        throw new Error('Image too large to store in localStorage');
      }
      return dataUrl;
    } catch (e) {
      // Fallback: try direct FileReader -> Base64.
      // If it doesn't fit localStorage size guard, fail fast.
      const dataUrl = await this.withTimeout(this.fileToDataUrl(file), this.storageDecodeTimeoutMs);
      if (this.estimateBytesFromDataUrl(dataUrl) > this.storageMaxBytes) {
        const lastMsg = (e as any)?.message ? String((e as any).message) : String(e);
        throw new Error(`Image too large to store in localStorage. ${lastMsg}`);
      }
      return dataUrl;
    }
  }

  private async hydratePendingImagesPreview(): Promise<void> {
    const queueKey = this.getPendingQueueKey();
    if (!queueKey) {
      this.imagelist = [];
      return;
    }

    const queue = this.readPendingQueue(queueKey);
    const items = Array.isArray(queue?.items) ? queue.items : [];
    this.imagelist = items
      .filter((it: any) => typeof it?.dataUrl === 'string' && it.dataUrl.length > 0)
      .map((it: any) => ({ src: it.dataUrl }));
  }

  private getPendingQueueKeysForPanel(panelId: string | number): string[] {
    const prefix = `pendingImages:${panelId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  }

  private async hydratePendingTotals(): Promise<void> {
    const panelId = this.pennelinfo?.id;
    if (!panelId) {
      this.queuedTotalsByStep = [];
      this.queuedTotalAllSteps = 0;
      return;
    }

    const keys = this.getPendingQueueKeysForPanel(panelId);
    const counts = new Map<string, number>();

    for (const key of keys) {
      const queue = this.readPendingQueue(key);
      const stepId = String(queue?.stepId ?? key.split(':').pop() ?? '');
      const items = Array.isArray(queue?.items) ? queue.items : [];
      if (!stepId) continue;
      const prev = counts.get(stepId) ?? 0;
      counts.set(stepId, prev + items.length);
    }

    const list = Array.from(counts.entries())
      .map(([stepId, count]) => ({ stepId, count }))
      .sort((a, b) => Number(a.stepId) - Number(b.stepId));

    this.queuedTotalsByStep = list;
    this.queuedTotalAllSteps = list.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
  }

  private async uploadGalleryFiles(files: File[]) {
    if (!files.length) {
      return;
    }
    // const allowed = await this.locationPermission.ensureLocationAllowed({ showRationale: true });
    // if (!allowed) {
    //   await this.presentToast('Location permission is needed to tag your photos.');
    //   return;
    // }
    await this.presentToast('Saving images locally. Please wait...');
    const loading = await this.loadingController.create({
      message: `Saving 0/${files.length} images...`,
      spinner: 'bubbles',
    });
    await loading.present();
    try {
      if (!this.pennelinfo?.id || this.activeStep == null || this.activeStep === '') {
        await this.presentToast('Missing site/step details. Please try again.');
        return;
      }

      const savedItems: any[] = [];
      let skipped = 0;
      const perImageErrors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        loading.message = `Saving ${i + 1}/${files.length} images...`;
        try {
          const file = files[i];
          // Store a downscaled JPEG (smaller Base64) to avoid localStorage/timeouts.
          const dataUrl = await this.withTimeout(
            this.fileToDownscaledJpegDataUrlForStorage(file),
            this.perImageTimeoutMs,
          );
          savedItems.push({
            dataUrl,
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            // Lat/Lng + watermark + 100KB compression will be applied on "Mark to Complete"
            sizeBytes: file.size,
          });
        } catch (e) {
          const file = files[i];
          const msg = (e as any)?.message ? String((e as any).message) : String(e);
          perImageErrors.push(msg);
          console.log('Per-image save error', {
            index: i,
            fileName: file?.name,
            mimeType: file?.type,
            sizeBytes: file?.size,
            error: msg,
          });
          skipped += 1;
        }
      }

      if (!savedItems.length) {
        const lastErr = perImageErrors.length ? perImageErrors[perImageErrors.length - 1] : '';
        const reason = lastErr ? ` Last error: ${lastErr}` : '';
        await this.presentToast(
          `No image could be saved locally. This usually happens when the photo is too large for localStorage. Try smaller images or upload fewer images.${reason}`,
        );
        return;
      }
      if (skipped > 0) {
        await this.presentToast(`Saved ${savedItems.length} image(s), skipped ${skipped} (save failed).`);
      }

      const queueKey = this.getPendingQueueKey();
      if (!queueKey) {
        await this.presentToast('Unable to queue images right now.');
        return;
      }

      const existingQueue = this.readPendingQueue(queueKey);
      const newItems = savedItems;

      const isCoordValid = (v: any): boolean => Number.isFinite(Number(v)) && Number(v) !== 0;
      const queuedLatitude = isCoordValid(this.latitude) ? Number(this.latitude) : null;
      const queuedLongitude = isCoordValid(this.longitude) ? Number(this.longitude) : null;

      const updatedQueue = {
        panelId: this.pennelinfo.id,
        stepId: String(this.activeStep ?? ''),
        latitude: queuedLatitude,
        longitude: queuedLongitude,
        items: [...(existingQueue?.items ?? []), ...newItems],
        updatedAt: Date.now(),
      };

      try {
        localStorage.setItem(queueKey, JSON.stringify(updatedQueue));
      } catch (e: any) {
        console.log('localStorage.setItem failed', e);
        await this.presentToast(
          'Could not save images locally (storage limit). Try fewer images or use smaller photos.',
        );
        return;
      }
      this.imagelist = updatedQueue.items.map((it: any) => ({ src: it.dataUrl }));
      await this.hydratePendingTotals();

      await this.presentToast(`${newItems.length} image(s) saved locally. Upload when you mark complete.`);
    } catch (e) {
      console.log('Image processing error', e);
      await this.presentToast('Image processing failed. Please try again.');
    } finally {
      await loading.dismiss();
    }
  }
  
  async presentToast($msg) {
		const toast = await this.toastController.create({
		  message: $msg,
		  duration: 3000
		});
		toast.present();
	}
  async showAlert() {
    const alert = await this.alertController.create({
      message: 'Images uploaded sucessfully',
      buttons: [
        {
          text: 'Yes!',
          handler: () => {}
        }
      ]
    }).then(res => {
      res.present();
    });
  }
  async captureImage() {
    try {
      // Fast path: let the native camera produce a base64 `dataUrl`.
      // This avoids canvas resizing/encoding (slow on WebViews).
      const image = await Camera.getPhoto({
        quality: 20,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        // Reduce output size so the base64 is smaller (still validated below).
        width: this.storageMaxDimension,
        height: this.storageMaxDimension,
      } as any);

      const dataUrl: string | undefined = image?.dataUrl;
      if (!dataUrl) {
        await this.presentToast('No image captured');
        return;
      }

      // Extract mime from `data:image/<mime>;base64,...`
      const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
      const mimeType = mimeMatch?.[1] || 'image/jpeg';
      const extension = this.getExtensionFromMime(mimeType);
      const fileName = `camera-${Date.now()}.${extension}`;
      await this.uploadCameraDataUrlToQueue({ dataUrl, fileName, mimeType });
    } catch (err) {
      console.log(err);
      await this.presentToast('Camera cancelled or unavailable');
    }
  }

  private async uploadCameraDataUrlToQueue(input: { dataUrl: string; fileName: string; mimeType: string }) {
    // Camera path already gives us a (hopefully) small JPEG/PNG.
    // We only validate size to protect localStorage and keep your upload flow unchanged.
    if (!this.pennelinfo?.id || this.activeStep == null || this.activeStep === '') {
      await this.presentToast('Missing site/step details. Please try again.');
      return;
    }

    const bytes = this.estimateBytesFromDataUrl(input.dataUrl);
    if (bytes > this.storageMaxBytes) {
      await this.presentToast(
        `Photo is too large for local storage. Try smaller photo size / fewer images. (Estimated ${Math.round(
          bytes / 1024
        )}KB)`,
      );
      return;
    }

    const queueKey = this.getPendingQueueKey();
    if (!queueKey) {
      await this.presentToast('Unable to queue images right now.');
      return;
    }

    const existingQueue = this.readPendingQueue(queueKey);
    const isCoordValid = (v: any): boolean => Number.isFinite(Number(v)) && Number(v) !== 0;
    const queuedLatitude = isCoordValid(this.latitude) ? Number(this.latitude) : null;
    const queuedLongitude = isCoordValid(this.longitude) ? Number(this.longitude) : null;

    const updatedQueue = {
      panelId: this.pennelinfo.id,
      stepId: String(this.activeStep ?? ''),
      latitude: queuedLatitude,
      longitude: queuedLongitude,
      items: [
        ...(existingQueue?.items ?? []),
        {
          dataUrl: input.dataUrl,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: bytes,
        },
      ],
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(queueKey, JSON.stringify(updatedQueue));
    } catch (e: any) {
      console.log('localStorage.setItem failed', e);
      await this.presentToast('Could not save image locally (storage limit). Try fewer images or smaller photos.');
      return;
    }

    this.imagelist = updatedQueue.items.map((it: any) => ({ src: it.dataUrl }));
    await this.hydratePendingTotals();
    await this.presentToast('1 image saved locally. Upload when you mark complete.');
  }

  private loadImageBitmap(file: File): Promise<HTMLImageElement> {
    // `createImageBitmap(file)` is unreliable on some WebViews/Cordova builds.
    // Always decode via FileReader -> <img> to keep the pipeline working.
    return new Promise((resolve, reject) => {
      try {
        // Prefer ObjectURL decoding (faster + avoids extra base64 expansion).
        const urlCreator = (window as any)?.URL;
        const canCreateObjectUrl = !!urlCreator?.createObjectURL;
        if (canCreateObjectUrl) {
          const objectUrl = urlCreator.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            try {
              urlCreator.revokeObjectURL(objectUrl);
            } catch {
              // ignore
            }
            resolve(img);
          };
          img.onerror = (e) => {
            try {
              urlCreator.revokeObjectURL(objectUrl);
            } catch {
              // ignore
            }
            reject(e);
          };
          img.src = objectUrl;
          return;
        }

        // Fallback: FileReader -> base64 -> <img>
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  private getExtensionFromMime(mimeType: string): string {
    const type = (mimeType || '').toLowerCase();
    if (type.includes('png')) {
      return 'png';
    }
    // Default everything else to JPG (we will convert to JPEG after).
    return 'jpg';
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async showLoading(){
    let loading = await this.loadingController.create({
        message: "Processing images (<=100KB) ...",
        spinner: "bubbles"
    });
    await loading.present();
  } 
 
  trackByImage(index: number): number {
    return index;
  }

  goToInfoStep() {
    const activeid = this.activeStep;
    void this.router.navigate(['/info'], {
      queryParams: { activeid: activeid != null && activeid !== '' ? parseInt(activeid) + 1 : '' },
    });
  }
}
