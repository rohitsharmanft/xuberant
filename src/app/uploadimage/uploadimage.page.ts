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
  private async refreshCoords(): Promise<void> {
    try {
      const resp = await this.geolocation.getCurrentPosition();
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
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
          });
          resolve();
        },
        (err) => {
          console.log('Browser geolocation error', err);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
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
    input.value = '';
    await this.uploadGalleryFiles(list);
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
    
    const formData = new FormData();
    for (const file of files) {
      formData.append('file[]', file, file.name);
    }
    formData.append('id', String(this.pennelinfo.id));
    formData.append('latitude', String(this.latitude));
    formData.append('longitude', String(this.longitude));
    formData.append('step_id', String(this.activeStep ?? ''));
    this.http.post(GlobalConstants.multipleimages, formData).subscribe({
      next: (data: any) => {
        if (data.status == '200') {
          this.loadingController.dismiss();
          const image_list = data.data;
          for (let i = 0; i < image_list.length; i++) {
            this.imagelist.push(image_list[i]);
          }
        } else {
          this.loadingController.dismiss();
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
      const allowed = await this.locationPermission.ensureLocationAllowed({ showRationale: true });
      if (!allowed) {
        await this.presentToast('Location permission is needed to tag your photos.');
        return;
      }
      await this.showLoading();
      const image = await Camera.getPhoto({
        quality: 30,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      const raw = image.base64String;
      if (!raw) {
        await this.presentToast('No image captured');
        return;
      }
      await this.refreshCoords();
      
      const base64Image = `data:image/jpeg;base64,${raw}`;
      const formData = new FormData();
      formData.append('image', base64Image);
      formData.append('id', this.pennelinfo.id);
      formData.append('latitude', this.latitude);
      formData.append('longitude', this.longitude);
      formData.append('step_id', this.activeStep);
      this.http.post(GlobalConstants.base64imageupload, formData).subscribe({
        next: (data: any) => {
          if (data.status == '200') {
            this.loadingController.dismiss();
            const image_list = data.data;
            for (let i = 0; i < image_list.length; i++) {
              this.imagelist.push(image_list[i]);
            }
          } else {
            this.loadingController.dismiss();
            this.presentToast('Image not upload please try agian later');
          }
        },
        error: (err) => {
          console.log(err);
          this.loadingController.dismiss();
          this.presentToast('Upload failed');
        },
      });
    } catch (err) {
      console.log(err);
      await this.presentToast('Camera cancelled or unavailable');
    }
  }

  async showLoading(){
    let loading = await this.loadingController.create({
        message: "Uploading Please wait...",
        spinner: "bubbles"
    });
    loading.present();
  } 
 
}
