import { Component, OnInit } from '@angular/core';
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router'
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  
  logininfo: any = ''
  pannellist: any =''
  constructor(private router: Router, private activatedRoute : ActivatedRoute, public http: HttpClient,public loadingController: LoadingController) { 
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.presentLoading() 
    this.getcontent()
  }

  ngOnInit() {
    if(localStorage.getItem('refreshpage') == 'Yes'){
      localStorage.setItem('refreshpage', 'No')
      window.location.reload();
    }
    
  }
  ionViewWillEnter() {
    this.getcontent()
  }
  async getcontent(){
    this.http.get(GlobalConstants.sitelist+''+this.logininfo.id)
		.subscribe((res: any) => {
        this.pannellist = res.data
		}, error => {
			console.log(error);
		});
  }
  getinfo(itemData:any){
    localStorage.setItem('panel', JSON.stringify(itemData))
    this.router.navigate(['/info']);
  }
  async presentLoading() {
		const loading = await this.loadingController.create({
		  cssClass: 'my-custom-class',
		  message: 'Please wait...',
		  duration: 1000
		});
		await loading.present();
	
		const { role, data } = await loading.onDidDismiss();
	  }
  
}
