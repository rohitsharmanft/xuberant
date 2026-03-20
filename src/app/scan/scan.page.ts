import { Component, OnInit } from '@angular/core';
import { BarcodeScanner } from '@awesome-cordova-plugins/barcode-scanner/ngx';
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Router,ActivatedRoute  } from '@angular/router'

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
  constructor(private activatedRoute: ActivatedRoute,private barcodeScanner: BarcodeScanner,public http: HttpClient,public toastController: ToastController,private geolocation: Geolocation) {
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
  scan() {
    this.selectedProduct = {};
    this.barcodeScanner.scan().then((barcodeData) => {
      if(barcodeData.text != ''){
        let formData = new FormData();
        formData.append('id' ,this.pennelinfo.id);
        formData.append('serialcode' , barcodeData.text);
        formData.append('latitude' , this.latitude);
        formData.append('longitude' , this.longitude);
        formData.append('step_id' , this.activeStep); 
        this.http.post(GlobalConstants.serialnumberverify, formData)
      .subscribe((data: any) => {
        if(data.status == 200){
          this.scancode =  barcodeData.text
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
    }, (err) => {
      console.log(err)
    });
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
}
