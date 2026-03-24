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
   imagelist: any = []
   pathimg = GlobalConstants.pathimg
   activeStep: any
   private lastCoordsAt = 0;
   private readonly coordsCacheMs = 2 * 60 * 1000; // reuse coordinates for 2 minutes
   private readonly allowedImageTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
   ]);
   private readonly webpQuality = 0.8;

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
      const resp = await this.geolocation.getCurrentPosition();
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
      await this.presentToast('Only JPG, PNG, and WEBP images are allowed.');
      input.value = '';
      return;
    }
    if (validFiles.length !== list.length) {
      await this.presentToast('Some files were skipped. Allowed: JPG, PNG, WEBP.');
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

  private async uploadGalleryFiles(files: File[]) {
    if (!files.length) {
      return;
    }
    const allowed = await this.locationPermission.ensureLocationAllowed({ showRationale: true });
    if (!allowed) {
      await this.presentToast('Location permission is needed to tag your photos.');
      return;
    }
    await this.showLoading();
    await this.refreshCoords();
    const webpFiles = await this.convertFilesToWebp(files);
    if (!webpFiles.length) {
      await this.loadingController.dismiss();
      await this.presentToast('Could not process selected images.');
      return;
    }
    
    const formData = new FormData();
    for (const file of webpFiles) {
      formData.append('file[]', file, file.name);
    }
    formData.append('id', String(this.pennelinfo.id));
    formData.append('latitude', String(this.latitude));
    formData.append('longitude', String(this.longitude));
    formData.append('step_id', String(this.activeStep ?? ''));
    this.http.post(GlobalConstants.multipleimages, formData).subscribe({
      next: (data: any) => {
        this.loadingController.dismiss();
        if (data.status == '200') {
          const image_list = data.data;
          if (Array.isArray(image_list) && image_list.length) {
            this.imagelist.push(...image_list);
          }
        } else {
          this.presentToast('Image not upload please try agian later');
        }
      },
      error: (err) => {
        console.log(err);
        this.loadingController.dismiss();
        this.presentToast('Upload failed');
      },
    });
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
      const image = await Camera.getPhoto({
        quality: 30,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
      if (!image.webPath) {
        await this.presentToast('No image captured');
        return;
      }
      const response = await fetch(image.webPath);
      const sourceBlob = await response.blob();
      const sourceFile = new File([sourceBlob], `camera-${Date.now()}.${this.getExtensionFromMime(sourceBlob.type)}`, {
        type: sourceBlob.type || 'image/jpeg',
      });
      await this.uploadGalleryFiles([sourceFile]);
    } catch (err) {
      console.log(err);
      await this.presentToast('Camera cancelled or unavailable');
    }
  }

  private async convertFilesToWebp(files: File[]): Promise<File[]> {
    const converted = await Promise.all(files.map((file) => this.convertImageFileToWebp(file)));
    return converted.filter((file): file is File => !!file);
  }

  private async convertImageFileToWebp(file: File): Promise<File | null> {
    try {
      const imageBitmap = await this.loadImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }
      ctx.drawImage(imageBitmap, 0, 0);
      this.drawBottomRightWatermark(ctx, canvas.width, canvas.height);
      const webpBlob = await this.canvasToWebpBlob(canvas);
      if (!webpBlob) {
        return null;
      }
      const fileName = this.replaceExtensionWithWebp(file.name);
      return new File([webpBlob], fileName, { type: 'image/webp' });
    } catch (err) {
      console.log('WebP conversion failed', err);
      return null;
    }
  }

  private drawBottomRightWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const fontSize = Math.max(11, Math.round(width * 0.015));
    const lineHeight = Math.round(fontSize * 1.35);
    const paddingX = Math.max(10, Math.round(fontSize * 0.8));
    const paddingY = Math.max(10, Math.round(fontSize * 0.8));
    const maxTextWidth = Math.round(width * 0.5);
    const sourceLines = this.getWatermarkLines();

    ctx.save();
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    const lines: string[] = [];
    for (const line of sourceLines) {
      const wrapped = this.wrapText(ctx, line, maxTextWidth);
      for (const item of wrapped) {
        lines.push(item);
      }
    }
    const textWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    const boxWidth = textWidth + (paddingX * 2);
    const boxHeight = (lines.length * lineHeight) + (paddingY * 2);
    const x = Math.max(8, width - boxWidth - 16);
    const y = Math.max(boxHeight + 8, height - 16);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(x, y - boxHeight, boxWidth, boxHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      const lineY = (y - boxHeight) + paddingY + (index * lineHeight);
      ctx.fillText(line, x + paddingX, lineY);
    });
    ctx.restore();
  }

  private getWatermarkLines(): string[] {
    const siteName = (this.pennelinfo?.name || '').toString().trim() || 'N/A';
    const address = (this.pennelinfo?.person_address || '').toString().trim() || 'N/A';
    const lat = Number.isFinite(Number(this.latitude)) ? Number(this.latitude).toFixed(6) : 'N/A';
    const lng = Number.isFinite(Number(this.longitude)) ? Number(this.longitude).toFixed(6) : 'N/A';
    const createdDate = this.formatCreatedDate(new Date());
    return [
      `Site: ${siteName}`,
      `Address: ${address}`,
      `Lat/Long: ${lat}, ${lng}`,
      `Created: ${createdDate}`,
    ];
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

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (!text) {
      return [''];
    }
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }
    if (current) {
      lines.push(current);
    }
    return lines.length ? lines : [text];
  }

  private loadImageBitmap(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private canvasToWebpBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', this.webpQuality);
    });
  }

  private replaceExtensionWithWebp(fileName: string): string {
    const dotIdx = fileName.lastIndexOf('.');
    if (dotIdx <= 0) {
      return `${fileName}.webp`;
    }
    return `${fileName.substring(0, dotIdx)}.webp`;
  }

  private getExtensionFromMime(mimeType: string): string {
    const type = (mimeType || '').toLowerCase();
    if (type.includes('png')) {
      return 'png';
    }
    if (type.includes('webp')) {
      return 'webp';
    }
    return 'jpg';
  }

  async showLoading(){
    let loading = await this.loadingController.create({
        message: "Uploading Please wait...",
        spinner: "bubbles"
    });
    await loading.present();
  } 
 
  trackByImage(index: number): number {
    return index;
  }
}
