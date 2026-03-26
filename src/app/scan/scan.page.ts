import { Component, OnInit } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Router,ActivatedRoute  } from '@angular/router'
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {
  products: any[] = [];
  selectedProduct: any;
  pennelinfo: any = ''
  productFound:boolean = false;
  option = 'NO'
  serialcode: any = ''
  latitude: any = 0; //latitude
  longitude: any = 0; //longitude
  scancode: any=''
  getlists: any =''
  activeStep: any
  constructor(private router: Router, private activatedRoute: ActivatedRoute,public http: HttpClient,public toastController: ToastController,private geolocation: Geolocation, private platform: Platform) {
    this.geolocation.getCurrentPosition().then((resp) => {
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
     }).catch((error) => {
       console.log('Error getting location', error);
     });
     console.log(this.latitude)
   }

  ngOnInit() {
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    

    this.activatedRoute.queryParams
      .subscribe(params => {
        console.log(params.activeid); 
        this.activeStep = params.activeid
      }
    );
    this.getcontent()
  }
  async scan() {
    if (!this.platform.is('cordova') && !this.platform.is('capacitor')) {
      this.presentToast('Barcode scan works only on installed mobile app.');
      return;
    }
    this.selectedProduct = {};
    try {
      const { barcodes } = await BarcodeScanner.scan({ autoZoom: true });
      const scannedValue = barcodes?.[0]?.rawValue || barcodes?.[0]?.displayValue || '';
      if(scannedValue != ''){
        let formData = new FormData();
        formData.append('id' ,this.pennelinfo.id);
        formData.append('serialcode' , scannedValue);
        formData.append('latitude' , this.latitude);
        formData.append('longitude' , this.longitude);
        formData.append('step_id' , this.activeStep); 
        this.http.post(GlobalConstants.serialnumberverify, formData)
      .subscribe((data: any) => {
        if(data.status == 200){
          this.scancode =  scannedValue
          this.option = 'YES'
          this.getcontent()
        }else if(data.status == 201){
          this.presentToast(data.message)
        }else if(data.status == 202){
          this.presentToast(data.message)
        }
      }, error => {
        console.log(error);
      });
      }else{
        this.presentToast('Failed try again');
      }
    } catch (err) {
      console.log(err)
      this.presentToast('Failed try again');
    }
  }
  submitform(){
    let formData = new FormData();
        formData.append('id' ,this.pennelinfo.id);
        formData.append('serialcode' ,this.serialcode);
        formData.append('latitude' , this.latitude);
        formData.append('longitude' , this.longitude);
        formData.append('step_id' , this.activeStep); 
        this.http.post(GlobalConstants.serialnumberverify, formData)
      .subscribe((data: any) => {
        if(data.status == 200){
          this.scancode =  this.serialcode
          this.option = 'YES'
          this.getcontent()
          this.presentToast(data.message)
        }else if(data.status == 201){
          this.presentToast(data.message)
        }else if(data.status == 202){
          this.presentToast(data.message)
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

  async getcontent(){
    this.http.get(GlobalConstants.getscanlist+''+this.pennelinfo.id+'?step_id='+this.activeStep)
		.subscribe((res: any) => {
        this.getlists = res.data
		}, error => {
			console.log(error);
		});
  }

  back(){
    this.option = 'NO'
  }
  goToInfoStep() {
    const activeid = this.activeStep;
    void this.router.navigate(['/info'], {
      queryParams: { activeid: activeid != null && activeid !== '' ? parseInt(activeid) + 1 : '' },
    });
  }
}
