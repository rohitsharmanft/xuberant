import { Component, OnInit } from '@angular/core';
import { Router,ActivatedRoute  } from '@angular/router'
import { PhotoService } from  '../services/photo.service';
import { FileUploader, FileLikeObject } from  'ng2-file-upload';
import { concat } from  'rxjs';
import { HttpClient,HttpHeaders  } from '@angular/common/http';
import { Camera, CameraOptions } from '@awesome-cordova-plugins/camera/ngx';
import {File} from '@awesome-cordova-plugins/file/ngx';
import { ActionSheetController,ToastController,AlertController,LoadingController  } from '@ionic/angular';
import{ GlobalConstants } from '../../common/global-constants';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Location } from '@angular/common'

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
  options: CameraOptions = {
    quality: 30,
    destinationType: this.camera.DestinationType.DATA_URL,
    encodingType: this.camera.EncodingType.JPEG,
    mediaType: this.camera.MediaType.PICTURE
  }
  activeStep: any
  public fileUploader: FileUploader = new FileUploader({});
  
  constructor(private router: Router, private activatedRoute: ActivatedRoute, private photoService: PhotoService,private camera: Camera, private http: HttpClient, private file: File,public actionSheetController: ActionSheetController,public toastController: ToastController,public alertController: AlertController,public loadingController: LoadingController,private geolocation: Geolocation,private location: Location) {
    this.geolocation.getCurrentPosition().then((resp) => {
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
     }).catch((error) => {
       console.log('Error getting location', error);
     });
   }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))

    this.activatedRoute.queryParams
      .subscribe(params => {
        console.log(params.activeid); 
        this.activeStep = params.activeid
      }
    );
  }
 

  getFiles(): FileLikeObject[] {
    return this.fileUploader.queue.map((fileItem) => {
      return fileItem.file;

    });
  }

  uploadFiles() {
    this.showLoading()
    let files = this.getFiles();
    let formData = new FormData();
    files.forEach((file) => {
      formData.append('file[]', file.rawFile as any, file.name as any);
    });
    formData.append('id' , this.pennelinfo.id);
    formData.append('latitude' , this.latitude);
    formData.append('longitude' , this.longitude); //
    formData.append('step_id' , this.activeStep); 
    this.http.post(GlobalConstants.multipleimages, formData)
		.subscribe((data: any) => {
			if(data.status == '200'){
        this.loadingController.dismiss();
        //this.showAlert()
        let image_list = data.data;
        for(let i=0; i<image_list.length; i++){
          this.imagelist.push(image_list[i])
        }
        this.fileUploader.queue = []
			}else{
        this.loadingController.dismiss();
				this.presentToast('Image not upload please try agian later')
			}
		}, error => {
			console.log(error);
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
          handler: () => {
            this.fileUploader.queue = []
          }
        }
      ]
    }).then(res => {
      res.present();
    });
  }
 captureImage() {

    this.camera.getPicture(this.options).then((imageData) => {
      this.showLoading()
      let base64Image = 'data:image/jpeg;base64,' + imageData;
      let formData = new FormData();
      formData.append('image' , base64Image);
      formData.append('id' , this.pennelinfo.id);
      formData.append('latitude' , this.latitude);
      formData.append('longitude' , this.longitude);
      formData.append('step_id' , this.activeStep); 
      this.http.post(GlobalConstants.base64imageupload, formData)
		  .subscribe((data: any) => {
        if(data.status == '200'){
          this.loadingController.dismiss();
          //this.showAlert()
          let image_list = data.data;
          for(let i=0; i<image_list.length; i++){
            this.imagelist.push(image_list[i])
          }

        }else{
          this.loadingController.dismiss();
          this.presentToast('Image not upload please try agian later')
        }
      }, error => {
        console.log(error);
      });

    }, (err) => {
      console.log(err);
      // Handle error
    });
  }

  async showLoading(){
    let loading = await this.loadingController.create({
        message: "Uploading Please wait...",
        spinner: "bubbles"
    });
    loading.present();
  } 
 
}
