import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router'
import{ GlobalConstants } from '../../common/global-constants';
import { ToastController,Platform  } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Location } from '@angular/common'

@Component({
  selector: 'app-mark',
  templateUrl: './mark.page.html',
  styleUrls: ['./mark.page.scss'],
})
export class MarkPage implements OnInit {
  logininfo: any = ''
  pennelinfo: any = ''
  option = 'send'
  latitude: any = 0; //latitude
  longitude: any = 0; //longitude
  otp: any = ''
  activeStep: any
  constructor(private router: Router,public http: HttpClient,public toastController: ToastController,private geolocation: Geolocation,private location: Location,private platform: Platform,private activatedRoute: ActivatedRoute) {
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
  sendOTP(){
    let formData = new FormData();
    formData.append('phone' , this.pennelinfo.person_phone);
		this.http.post(GlobalConstants.sendotpcustomer, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
        this.option = 'view'
			}
		}, error => {
			console.log(error);
		});
  }
  submitform(){
    let formData = new FormData();
    if(this.otp == null || this.otp == ''){
      this.presentToast('Please enter OTP')
      return false
    }
    formData.append('phone' , this.pennelinfo.person_phone);
    formData.append('latitude' , this.latitude);
    formData.append('longitude' , this.longitude);
    formData.append('otp' , this.otp);
    formData.append('id' ,  this.pennelinfo.id); 
    formData.append('step_id' ,  this.activeStep);
		this.http.post(GlobalConstants.marktocomplete, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
        localStorage.setItem('back', 'Yes')
        window.location.href ='/dashboard';
			}else if(data.status == 201){
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
}
