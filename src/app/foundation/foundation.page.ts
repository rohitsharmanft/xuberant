import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Router,ActivatedRoute  } from '@angular/router'
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient,HttpHeaders  } from '@angular/common/http';
@Component({
  selector: 'app-foundation',
  templateUrl: './foundation.page.html',
  styleUrls: ['./foundation.page.scss'],
})
export class FoundationPage implements OnInit {
  pennelinfo: any = ''
  cost: any= ''
  amount: any= ''
  explanation: any= ''
  latitude: any = 0; //latitude
  longitude: any = 0; //longitude
  activeStep: any
  constructor(private router: Router,private activatedRoute: ActivatedRoute,public toastController: ToastController,private geolocation: Geolocation, private http: HttpClient) { 
    this.getlocation()
  }

  ngOnInit() {
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    this.activatedRoute.queryParams
      .subscribe(params => {
        console.log(params.activeid); 
        this.activeStep = params.activeid
      }
    );
    
  }

  submitform(){

    
    let formData = new FormData();
    if(this.cost == null || this.cost == ''){
      this.presentToast('Please enter total spends on foundation material')
      return false
    }
    if(this.amount == null || this.amount == ''){
      this.presentToast('Please enter amounts given to')
      return false
    }
    if(this.explanation == null || this.explanation == ''){
      this.presentToast('Please enter mobile number of seller on the store')
      return false
    }
		formData.append('id' , this.pennelinfo.id);
    formData.append('cost' , this.cost);
    formData.append('amount' , this.amount);
    formData.append('explanation' , this.explanation);
    formData.append('latitude' , this.latitude);
    formData.append('longitude' , this.longitude);
    formData.append('step_id' , this.activeStep);
		this.http.post(GlobalConstants.foundation, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
        this.cost = ''
        this.amount = ''
        this.explanation = ''
        this.presentToast('Form submitted successfully')
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

  getlocation() {
    this.geolocation.getCurrentPosition().then((resp) => {
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
     }).catch((error) => {
       console.log('Error getting location', error);
     });
  }
  goToInfoStep() {
    const activeid = this.activeStep;
    void this.router.navigate(['/info'], {
      queryParams: { activeid: activeid != null && activeid !== '' ? parseInt(activeid) + 1 : '' },
    });
  }
}
