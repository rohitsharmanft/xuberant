import { Component } from '@angular/core';
import { concat } from  'rxjs';
import { OtpPage } from '../otp/otp.page';
import { Router } from '@angular/router';
import { ToastController,LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import{ GlobalConstants } from '../../common/global-constants';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage{
	mobile:any = '';
	logininfo: any = ''
	constructor(private router: Router,public toastController: ToastController,public http: HttpClient,public loadingController: LoadingController){
		this.logininfo = localStorage.getItem('authlogin') 
	} 
	ngOnInit() {
		
	}
	ionViewWillEnter() {
	
	}
	submitForm(){
		if(this.mobile == null || this.mobile == ''){
			this.presentToast('Enter you mobile number')
			return false
		}
		let formData = new FormData();
		formData.append('phone' , this.mobile);
		this.presentLoading() 
		this.http.post(GlobalConstants.apiLogin, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
				this.router.navigate(['/otp', { 'phone': this.mobile }]);
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
	async presentLoading() {
		const loading = await this.loadingController.create({
		  cssClass: 'my-custom-class',
		  message: 'Please wait...',
		  duration: 3000
		});
		await loading.present();
		const { role, data } = await loading.onDidDismiss();
	  }
}
