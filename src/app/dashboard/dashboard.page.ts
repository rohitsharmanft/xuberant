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
  pannellist: any = []
  searchTerm: string = ''
  searchResults: any = ''
  constructor(private router: Router, private activatedRoute : ActivatedRoute, public http: HttpClient,public loadingController: LoadingController) {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
   
  }

  ngOnInit() {
    console.log(this.logininfo.type, "type 2");
    if(localStorage.getItem('refreshpage') == 'Yes'){
      localStorage.setItem('refreshpage', 'No')
      window.location.reload();
    }
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    if (this.logininfo.type == '1') {
      this.getcontent()
    }
  }
  ionViewWillEnter() {
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    if (this.logininfo.type == '1') {
      this.getcontent()
    }
  }
  async getcontent() {
  const url = `${GlobalConstants.sitelist}/${this.logininfo.id}/${this.logininfo.type}/AD123`;

  this.http.get(url)
    .subscribe((res: any) => {
      this.pannellist = res.data;
    }, error => {
      console.log(error);
    });
}
  doSearch(){
    if (!this.searchTerm) return;
     const url = `${GlobalConstants.sitelist}/${this.logininfo.id}/${this.logininfo.type}/${this.searchTerm}`;
    let formData = new FormData();
    // formData.append('search', this.searchTerm);
    // formData.append('type', '2');
    this.presentLoading();
    this.http.get(url)
    .subscribe((res: any) => {
      this.searchResults = res.data;
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
