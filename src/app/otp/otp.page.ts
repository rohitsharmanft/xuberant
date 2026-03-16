import { Component, OnInit } from '@angular/core';
import { ActivatedRoute  } from '@angular/router';
import { GlobalConstants } from '../../common/global-constants';
import { HttpClient } from '@angular/common/http';
import { ToastController,LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
})
export class OtpPage implements OnInit {
	phone:any =''
	otp:any = {};
    constructor(private router: Router, private activatedRoute : ActivatedRoute, public http: HttpClient, public toastController: ToastController,public loadingController: LoadingController  ) { 
	this.phone = this.activatedRoute.snapshot.paramMap.get('phone')
	if (this.phone.indexOf('91') > -1){
		this.phone = "+"+this.phone
	}
  }

  ngOnInit() {
	
  }
  
   otpController(event,next,prev){
	   if(event.target.value.length < 1 && prev){
		 prev.setFocus()
	   }
	   else if(next && event.target.value.length>0){
		 next.setFocus();
	   }
	   else {
		return 0;
	   } 
   }
   submitForm(){
		let mobileotp = this.otp.otp1+''+this.otp.otp2+''+this.otp.otp3+''+this.otp.otp4
		let formData = new FormData();
		formData.append('phone' , this.phone);
		formData.append('otp' , mobileotp);
		this.presentLoading() 
		this.http.post(GlobalConstants.otpverify, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
				localStorage.setItem('authlogin', JSON.stringify(data.data))
				localStorage.setItem('refreshpage', 'Yes')
				this.router.navigate(['/dashboard']);
			}else if(data.status == 201){
				this.presentToast(data.message)
			}
		}, error => {
			console.log(error);
		});
   }
   async presentToast(msg:string) {
	const toast = await this.toastController.create({
	  message: msg,
	  duration: 3000
	});
	toast.present();
	}
	async presentLoading() {
		const loading = await this.loadingController.create({
		  cssClass: 'my-custom-class',
		  message: 'Please wait...',
		  duration: 2000
		});
		await loading.present();
	
		const { role, data } = await loading.onDidDismiss();
		console.log('Loading dismissed!');
	  }

}
