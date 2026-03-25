import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router'
import{ GlobalConstants } from '../../common/global-constants';
import { ToastController,Platform, LoadingController  } from '@ionic/angular';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Location } from '@angular/common'
import { File as CordovaFile } from '@awesome-cordova-plugins/file/ngx';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-mark',
  templateUrl: './mark.page.html',
  styleUrls: ['./mark.page.scss'],
})
export class MarkPage implements OnInit {
  logininfo: any = ''
  pennelinfo: any = ''
  logoPrint: any = ''
  option = 'send'
  latitude: any = 30.7241744; //latitude
  longitude: any = 76.715603; //longitude
  otp: any = ''
  activeStep: any
  showCustomOtpForm = false
  private lastImageUploadError: string = '';
  private readonly debugUploadLogKey = 'debug:lastMultipleStepImagesUpload';

  private storeDebugUploadLog(log: any) {
    const payload = { ...log, ts: Date.now() };
    try {
      localStorage.setItem(this.debugUploadLogKey, JSON.stringify(payload));
    } catch {
      // ignore quota/storage errors
    }
    console.log('DEBUG multipleStepImages upload:', payload);

    // Also write a human-readable .txt file for easier sharing.
    void this.saveDebugLogAsTxt(payload);
  }

  private async saveDebugLogAsTxt(payload: any): Promise<void> {
    try {
      const dir = this.cordovaFile.dataDirectory;
      const safeTs = new Date(payload?.ts || Date.now()).toISOString().replace(/[:.]/g, '-');
      const fileName = `multipleStepImages-debug-${safeTs}.txt`;
      const text = JSON.stringify(payload, null, 2);
      //this.logoPrint = text;
      await this.cordovaFile.writeFile(dir, fileName, text, { replace: false });

      //await this.presentToast(`Debug log saved: ${fileName}`);
    } catch (e) {
      console.log('saveDebugLogAsTxt failed', e);
      // Fallback for browser/ionic serve: trigger a download
      try {
        const safeTs = new Date(payload?.ts || Date.now()).toISOString().replace(/[:.]/g, '-');
        const fileName = `multipleStepImages-debug-${safeTs}.txt`;
        const text = JSON.stringify(payload, null, 2);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch {
        // ignore
      }
    }
  }

  constructor(private router: Router,public http: HttpClient,public toastController: ToastController,private geolocation: Geolocation,private location: Location,private platform: Platform,private activatedRoute: ActivatedRoute, private loadingController: LoadingController, private cordovaFile: CordovaFile) {
      this.platform.ready().then(()=>{
      var options = {
        timeout: 20000 //sorry I use this much milliseconds
      } 
      this.geolocation.getCurrentPosition(options).then(data=>{
        this.longitude = data.coords.longitude;
        this.latitude = data.coords.latitude;
       }).catch((err)=>{
         console.log("Error", err);
         });
      });

   }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    console.log(this.pennelinfo.person_phone)

    this.activatedRoute.queryParams
      .subscribe(params => {
        console.log(params.activeid); 
        this.activeStep = params.activeid
      }
    );
  }
  async sendOTP(){

    let loader = await this.loadingController.create({
      message: `Please wait...`,
      spinner: 'bubbles',
    });
    await loader.present();
    this.otp = '1234'
    let formData = new FormData();
    formData.append('phone' , this.pennelinfo.person_phone);
		this.http.post(GlobalConstants.sendotpcustomer, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
        this.option = 'view'
        void this.submitform()
			}
		}, error => {
			console.log(error);
		});
  }
  private getPendingQueueKey(): string {
    const panelId = this.pennelinfo?.id;
    const stepId = this.activeStep ?? '';
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

  private getPendingQueueKeysForPanel(panelId: string | number): string[] {
    const prefix = `pendingImages:${panelId}:`;
    const keys: string[] = [];
    // localStorage has no wildcard APIs, so we scan keys and filter by prefix.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  }

  // Convert a queued `data:<mime>;base64,<payload>` string into just the base64 payload.
  // Backend must support receiving base64 as text for `steps[..][file][]`.
  private extractBase64FromDataUrl(dataUrl: string): string {
    const idx = dataUrl.indexOf(',');
    if (idx < 0) return dataUrl;
    return dataUrl.slice(idx + 1);
  }

  // Rough base64 byte estimation (base64 expands ~4/3; inverse is ~3/4).
  private estimateBytesFromBase64(base64: string): number {
    return Math.floor((base64.length * 3) / 4);
  }

  private readonly maxImageBytes = 100 * 1024; // 100KB
  // NOTE: conversion/compression helpers were removed in favor of sending base64 directly.

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

  // (removed) canvas/image conversion helpers

  private replaceExtensionWithJpeg(fileName: string): string {
    const dotIdx = fileName.lastIndexOf('.');
    if (dotIdx <= 0) return `${fileName}.jpg`;
    return `${fileName.substring(0, dotIdx)}.jpg`;
  }

  private formatCreatedDate(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    return `${day}-${month}-${year} ${hour}:${minute}`;
  }

  // (removed) image conversion + legacy `multipleimages` uploader

  private async uploadPendingImagesAllStepsForPanel(panelId: string | number): Promise<boolean> {
    this.lastImageUploadError = '';
    const queueKeys = this.getPendingQueueKeysForPanel(panelId);
    if (!queueKeys.length) return true; // nothing to upload

    // Group by stepId so we can send steps[0][...] payload.
    const stepsMap = new Map<string, { stepId: string; items: any[] }>();

    for (const key of queueKeys) {
      const queue = this.readPendingQueue(key);
      const stepId = String(queue?.stepId ?? key.split(':').pop() ?? '');
      const items: any[] = Array.isArray(queue?.items) ? queue.items : [];
      if (!stepId || !items.length) continue;
      stepsMap.set(stepId, { stepId, items });
    }

    const stepList = Array.from(stepsMap.values()).sort((a, b) => Number(a.stepId) - Number(b.stepId));
    if (!stepList.length) return true;

    const totalImages = stepList.reduce((sum, s) => sum + (Array.isArray(s.items) ? s.items.length : 0), 0);
    if (totalImages === 0) return true;

    let processed = 0;
    let skipped = 0;

    let loader: any;
    try {
    

      const formData = new FormData();
      formData.append('id', String(panelId));

      

      // Prefer GPS coordinates already loaded on this page.
      // If they're invalid, try to reuse queued coordinates (if available).
      const isCoordValid = (v: any): boolean => Number.isFinite(Number(v)) && Number(v) !== 0;
      if (!isCoordValid(this.latitude) || !isCoordValid(this.longitude)) {
        for (const key of queueKeys) {
          const queued = this.readPendingQueue(key);
          const qLat = queued?.latitude;
          const qLng = queued?.longitude;
          if (isCoordValid(qLat) && isCoordValid(qLng)) {
            this.latitude = Number(qLat);
            this.longitude = Number(qLng);
            break;
          }
        }
      }

      // Backend validation is sensitive to missing/invalid lat/lng.
      if (
        !Number.isFinite(this.latitude) ||
        !Number.isFinite(this.longitude) ||
        Number(this.latitude) === 0 ||
        Number(this.longitude) === 0
      ) {
        this.lastImageUploadError = 'Location coordinates are missing/invalid. Enable GPS and try again.';
        await this.presentToast(this.lastImageUploadError);
        this.storeDebugUploadLog({
          panelId,
          latitude: this.latitude,
          longitude: this.longitude,
          totalImages,
          reason: 'missing_coordinates',
        });
        return false;
      }

      formData.append('latitude', String(this.latitude));
      formData.append('longitude', String(this.longitude));

      loader = await this.loadingController.create({
        message: `Processing ${stepList.length} step(s), ${totalImages} image(s)...`,
        spinner: 'bubbles',
      });
      await loader.present();

      const stepsPreview = stepList.map((s: any, index: number) => ({
        index,
        step_id: s.stepId,
        fileCount: Array.isArray(s.items) ? s.items.length : 0,
      }));

      this.storeDebugUploadLog({
        panelId,
        latitude: this.latitude,
        longitude: this.longitude,
        stepsPreview,
        totalImages,
      });

      let allOk = true;
      const appendedFilesByStep = new Array(stepList.length).fill(0);
      let appendedTotalFiles = 0;
      let appendedOverLimitFiles = 0;

      for (let stepIndex = 0; stepIndex < stepList.length; stepIndex++) {
        const step = stepList[stepIndex];
        formData.append(`steps[${stepIndex}][step_id]`, String(step.stepId));

        const items: any[] = Array.isArray(step.items) ? step.items : [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          const item = items[itemIndex];
          const dataUrl = item?.dataUrl;
          if (typeof dataUrl !== 'string' || !dataUrl) {
            skipped += 1;
            continue;
          }

          processed += 1;
          loader.message = `Preparing ${processed}/${totalImages} images...`;

          const base64image = this.extractBase64FromDataUrl(dataUrl);
          if (!base64image) {
            skipped += 1;
            allOk = false;
            continue;
          }

          // IMPORTANT: backend must accept base64 strings for `steps[..][file][]`.
          formData.append(`steps[${stepIndex}][file][]`, base64image);
          appendedFilesByStep[stepIndex] += 1;
          appendedTotalFiles += 1;
          const estimatedBytes = this.estimateBytesFromBase64(base64image);
          if (estimatedBytes > this.maxImageBytes) appendedOverLimitFiles += 1;
        }
      }
      // FormData cannot be JSON-stringified use a serializable debug snapshot instead.
      const debugSnapshot = {
        id: panelId,
        latitude: this.latitude,
        longitude: this.longitude,
        steps: stepList.map((s: any, idx: number) => ({
          stepIndex: idx,
          step_id: s.stepId,
          fileCount: Array.isArray(s.items) ? s.items.length : 0,
        })),
      };
      // Use serializable debug snapshot (FormData cannot be JSON-stringified reliably).
      // This is only for UI visibility/debugging.
      this.logoPrint = JSON.stringify(
        {
          id: panelId,
          latitude: this.latitude,
          longitude: this.longitude,
          steps: stepList.map((s: any, idx: number) => ({
            stepIndex: idx,
            step_id: s.stepId,
            requestedFileCount: Array.isArray(s.items) ? s.items.length : 0,
            appendedFileCount: appendedFilesByStep[idx] ?? 0,
          })),
          totalImages,
          appendedTotalFiles,
          appendedOverLimitFiles,
          skipped,
        },
        null,
        2,
      );

      if (appendedTotalFiles === 0) {
        const msg = `No image files were appended for upload (missing/invalid dataUrl). Skipped: ${skipped}.`;
        this.lastImageUploadError = msg;

        console.log('multipleStepImages: EARLY RETURN (no files appended)', {
          panelId,
          latitude: this.latitude,
          longitude: this.longitude,
          stepList: stepList.map((s: any) => ({ stepId: s.stepId, requestedCount: Array.isArray(s.items) ? s.items.length : 0 })),
          appendedTotalFiles,
          appendedFilesByStep,
          skipped,
          totalImages,
          allOk,
        });

        if (loader) {
          try {
            await loader.dismiss();
          } catch {
            // ignore
          }
        }
        await this.presentToast(msg);
        return false;
      }

      console.log('multipleStepImages: SENDING REQUEST', {
        panelId,
        latitude: this.latitude,
        longitude: this.longitude,
        stepsPreview: stepsPreview,
        totalImages,
        appendedTotalFiles,
        appendedFilesByStep,
        skipped,
        allOk,
      });

      loader.message = `Uploading images...`;
      const data: any = await firstValueFrom(this.http.post(GlobalConstants.multipleStepImages, formData));
      await loader.dismiss();

      const status = data?.status;
      if (status == 200 || status == '200') {
        if (!allOk || skipped > 0) {
          // Do not clear queue if some images were too large to satisfy the 100KB cap.
          const msg = `Some images were skipped (${skipped} skipped). Please select valid images and try again.`;
          this.lastImageUploadError = msg;
          await this.presentToast(msg);
          return false;
        }

        for (const key of queueKeys) localStorage.removeItem(key);
        return true;
      }

      this.lastImageUploadError = `Image upload API returned status ${status}.`;
      return false;
    } catch (e: any) {
      console.log('multipleStepImages error', e);
      if (loader) {
        try {
          await loader.dismiss();
        } catch {
          // ignore
        }
      }

      // HttpErrorResponse structure usually: { status, error, message }
      const status = e?.status ?? e?.response?.status;
      const errBody = e?.error ?? e?.response?.data ?? e?.message;
      let errText = '';
      if (typeof errBody === 'string') {
        errText = errBody;
      } else if (errBody) {
        errText =
          errBody?.message ||
          errBody?.error ||
          errBody?.detail ||
          (Array.isArray(errBody?.errors) ? errBody.errors.join(', ') : '') ||
          JSON.stringify(errBody);
      }

      if (!errText) {
        try {
          errText = JSON.stringify(e);
        } catch {
          errText = String(e?.message || e);
        }
      }

      this.lastImageUploadError = `Image upload failed: HTTP ${status ?? 'unknown'}. ${errText}`;

      this.storeDebugUploadLog({
        panelId,
        latitude: this.latitude,
        longitude: this.longitude,
        status,
        errText,
        errBody,
      });
      return false;
    }
  }

  async submitform(){
    let formData = new FormData();
    if(this.otp == null || this.otp == ''){
      this.presentToast('Please enter OTP')
      return false
    }

    // Refresh coordinates briefly so watermark + server upload has correct lat/lng.
    try {
      const resp: any = await this.withTimeout(
        this.geolocation.getCurrentPosition({ timeout: 20000 } as any),
        10000,
      );
      this.latitude = resp?.coords?.latitude ?? this.latitude;
      this.longitude = resp?.coords?.longitude ?? this.longitude;
    } catch {
      // Keep existing coordinates (or 0) if GPS is not available.
    }

    const panelId = this.pennelinfo?.id;
    if (panelId) {
      const ok = await this.uploadPendingImagesAllStepsForPanel(panelId);
      if (!ok) {
        this.presentToast(this.lastImageUploadError || 'Image upload failed. Please try again.');
        return false;
      }
    }

    formData.append('phone' , this.pennelinfo.person_phone);
    formData.append('latitude' , this.latitude);
    formData.append('longitude' , this.longitude);
    formData.append('otp' , this.otp);
    formData.append('id' ,  this.pennelinfo.id); 
    formData.append('step_id' ,  this.activeStep);
		try {
      const data: any = await firstValueFrom(this.http.post(GlobalConstants.marktocomplete, formData));
      if(data.status == 200 || data.status == '200'){
        this.presentToast('site work is completed successfully')
        localStorage.setItem('back', 'Yes')
        window.location.href ='/dashboard';
      }else if(data.status == 201 || data.status == '201'){
        this.presentToast(data.message)
      }
    } catch (error) {
      console.log(error);
    }
  }
  async presentToast($msg) {
		const toast = await this.toastController.create({
		  message: $msg,
		  duration: 3000
		});
		toast.present();
	}
}
