import { Component, OnInit,EventEmitter,Input,Output } from '@angular/core';
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router'
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { ToastController } from '@ionic/angular';
import { ConsoleLogger } from 'node_modules/@angular/compiler-cli/ngcc';
import { NativeGeocoder, NativeGeocoderResult, NativeGeocoderOptions } from '@ionic-native/native-geocoder/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';

@Component({
  selector: 'app-info',
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss'],
})
export class InfoPage implements OnInit {

  //@Input() totalRecords = 0;  
  //@Input() recordsPerPage = 0; 
  @Output() onPageChange: EventEmitter<number> = new EventEmitter();  

  logininfo: any = ''
  pennelinfo: any = ''
  latitude: any = 0; //latitude
  longitude: any = 0; //longitude
  name: any= '' 
  address: any= ''
  phone: any= ''
  altphone: any= ''
  email: any= ''
  option = 'form'
  data: any = ''
  totalRecords: any
  recordsPerPage = 1
  pages: number [] = []
  activePage: number = 1
  activeStep: any
  photo = false
  scan = false
  form = false
  mark = false
  sendstep: any;
  list: any
  imageurl: any;
  lightbox:any;
  nativeGeocoderOptions: NativeGeocoderOptions = {
    useLocale: true,
    maxResults: 5
  };
  constructor(private router: Router, private activatedRoute : ActivatedRoute, public http: HttpClient,public toastController: ToastController,private geolocation: Geolocation,private nativeGeocoder: NativeGeocoder,private photoViewer: PhotoViewer) {
      this.getCurrentCoordinates()
   }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    if(this.pennelinfo.status == 'S'){
      this.option = 'view'
    }
    this.getcontent()
  }
  ionViewWillEnter() { 
    if(this.sendstep != undefined) {
      this.getPagecontent(this.pennelinfo.id,this.sendstep)
    }
    
  }
  submitform(){

    
    let formData = new FormData();
    if(this.name == null || this.name == ''){
      this.presentToast('Please enter name')
      return false
    }
    if(this.address == null || this.address == ''){
      this.presentToast('Please enter address')
      return false
    }
    if(this.phone == null || this.phone == ''){
      this.presentToast('Please enter phone no')
      return false
    }
		formData.append('id' , this.pennelinfo.id);
    formData.append('name' , this.name);
    formData.append('address' , this.address);
    formData.append('phone' , this.phone);
    formData.append('altphone' , this.altphone);
    formData.append('email' , this.email);
    formData.append('latitude' , this.latitude);
    formData.append('longitude' , this.longitude);
		this.http.post(GlobalConstants.startproject, formData)
		.subscribe((data: any) => {
			if(data.status == 200){
        localStorage.setItem('panel', JSON.stringify(data.data))
        this.presentToast(data.message)
        this.option = 'view'
        this.getcontent()
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
  nextpage(next:any){
    this.router.navigate(['/'+next],{queryParams: {activeid: this.sendstep }});
  }

  async getcontent(){
    let siteid = this.pennelinfo.id
    this.http.post(GlobalConstants.sitestep+''+siteid, '')
		.subscribe((res: any) => {
      this.data = res.data
      this.totalRecords = res.data.length;
      let i =0;
      this.activeStep = []
      this.data.forEach((currentValue, index) => {
        i =  index+1;
        if(currentValue.status == 'S') {
          // Set Active page when page load
          this.activePage = i
          this.sendstep = currentValue.step_id
          this.activeStep = (currentValue.permission).split(',')
        }
      });
      //console.log(this.activeStep);
      this.getPagecontent(siteid,this.sendstep)
      this.permissionStep()

      //console.log()
      const pageCount = this.getPageCount();  
      this.pages = this.getArrayOfPage(pageCount); 
		}, error => {
			console.log(error);
		});
   
  }
// Pagination code
  private  getPageCount(): number {  
    let totalPage = 0;  

    if (this.totalRecords > 0 && this.recordsPerPage > 0) {  
      const pageCount = this.totalRecords / this.recordsPerPage;  
      const roundedPageCount = Math.floor(pageCount);  

      totalPage = roundedPageCount < pageCount ? roundedPageCount + 1 : roundedPageCount;  
    }  

    return totalPage;  
  } 

  private getArrayOfPage(pageCount: number): number [] {  
    const pageArray = [];  

    if (pageCount > 0) {  
        for(let i = 1 ; i <= pageCount ; i++) {  
          pageArray.push(i);  
        }  
    }  

    return pageArray;  
  } 

  onClickPage(pageNumber: number): void {  
    //console.log(pageNumber);
    if (pageNumber >= 1 && pageNumber <= this.pages.length) {  
        this.activePage = pageNumber;  
        this.onPageChange.emit(this.activePage);  

        this.activeStep = []
        this.data.forEach((currentValue, index) => {
          let i =  index+1;
          if(i == pageNumber) {
            this.sendstep = currentValue.step_id
            this.activeStep = (currentValue.permission).split(',')
          }
        });
        this.getPagecontent(this.pennelinfo.id,this.sendstep)
        this.permissionStep()
    }else {
      //alert('No page found');
    }
    //console.log(this.activeStep);
    
  }  
  // Pagination code

  getCurrentCoordinates() {
    this.geolocation.getCurrentPosition().then((resp) => {
      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
      //if(this.option == 'form') {
        // Get Address
        this.getAddress(this.latitude, this.longitude);
      //}
      
     }).catch((error) => {
       console.log('Error getting location', error);
     });
  }
  getAddress(lat,long){
    this.address = 'test';
    return false;
    this.nativeGeocoder.reverseGeocode(lat, long, this.nativeGeocoderOptions)
    .then((res: NativeGeocoderResult[]) => {
      this.address = this.pretifyAddress(res[0]);
    })
    .catch((error: any) => {
      alert('Error getting location'+ JSON.stringify(error));
    });
  }

  pretifyAddress(address){
    let obj = [];
    let data = "";
    for (let key in address) {
      obj.push(address[key]);
    }
    obj.reverse();
    for (let val in obj) {
      if(obj[val].length)
      data += obj[val]+', ';
    }
    return address.slice(0, -2);
  }

  async getPagecontent(siteid,stepid){
    //this.list = '';
    this.http.get(GlobalConstants.getstepsite+''+siteid+'/'+stepid)
		.subscribe((resp: any) => {
      if(resp.data != '') {
        this.imageurl = resp.imageurl;
        this.list= resp.data
      }else {
        this.list = [];
      }
      
		}, error => {
			console.log(error);
		});
  }

  permissionStep() {
    this.photo = false;
    this.scan = false;
    this.form = false;
    this.mark = false;
    if(this.activeStep.includes('P')) {
      this.photo = true
    }
    if( this.activeStep.includes('S')) {
      this.scan = true
    }
    if(this.activeStep.includes('F')) {
      this.form = true
    }
    if(this.activeStep.includes('O')) {
      this.mark = true
    }
  }

  viewImage(path,img) {
    this.photoViewer.show(path+img);
  }
}
