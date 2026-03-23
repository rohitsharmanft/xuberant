import { Component, OnInit,EventEmitter,Input,Output } from '@angular/core';
import{ GlobalConstants } from '../../common/global-constants';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router'
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { LoadingController, ToastController } from '@ionic/angular';
import { NativeGeocoder, NativeGeocoderResult, NativeGeocoderOptions } from '@awesome-cordova-plugins/native-geocoder/ngx';
import { PhotoViewer } from '@awesome-cordova-plugins/photo-viewer/ngx';
import { LocationPermissionService } from '../services/location-permission.service';
import { firstValueFrom } from 'rxjs';
import { normalizeCivilItems, normalizeInstallationItems } from '../../common/php-unserialize';

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
  installationItems: { title: string; quantity: string }[] = [];
  additionalItems: { name: string; items: { title: string; quantity: string }[] }[] = [];
  nativeGeocoderOptions: NativeGeocoderOptions = {
    useLocale: true,
    maxResults: 5
  };
  get isSiteTypeTwo(): boolean {
    return Number(this.pennelinfo?.site_type) === 2;
  }
  constructor(private router: Router, private activatedRoute : ActivatedRoute, public http: HttpClient,public toastController: ToastController, private loadingController: LoadingController,private geolocation: Geolocation,private nativeGeocoder: NativeGeocoder,private photoViewer: PhotoViewer, private locationPermission: LocationPermissionService) {
    /* Do not request geolocation on construct — it can steal the first tap/gesture (Site info etc.). Use “Get location” instead. */
   }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    this.hydrateSiteItemsFromPanel()
    this.hydrateContactFromPanel()
    if(this.pennelinfo.status == 'S'){
      this.option = 'view'
    }
    this.getcontent()
  }
  async ionViewWillEnter() { 
    if(this.sendstep != undefined) {
      this.getPagecontent(this.pennelinfo.id,this.sendstep)
    }
    const resp = await this.geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });

    this.latitude = resp.coords.latitude;
    this.longitude = resp.coords.longitude;
  }
  submitform(){

    
    let formData = new FormData();
    const submitName = this.isSiteTypeTwo ? this.pennelinfo?.person_name : this.name;
    const submitAddress = this.isSiteTypeTwo ? this.pennelinfo?.person_address : this.address;
    const submitPhone = this.isSiteTypeTwo ? this.pennelinfo?.person_phone : this.phone;

    if(submitName == null || submitName == ''){
      this.presentToast('Please enter name')
      return false
    }
    if(submitAddress == null || submitAddress == ''){
      this.presentToast('Please enter address')
      return false
    }
    if(submitPhone == null || submitPhone == ''){
      this.presentToast('Please enter phone no')
      return false
    }
		formData.append('id' , this.pennelinfo.id);
    formData.append('name' , submitName);
    formData.append('address' , submitAddress);
    formData.append('phone' , submitPhone);
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
  private hydrateContactFromPanel() {
    if (!this.pennelinfo) {
      return;
    }
    this.name = this.pennelinfo?.person_name || this.name || '';
    this.address = this.pennelinfo?.person_address || this.address || '';
    this.email = this.pennelinfo?.person_email || this.email || '';
    this.phone = this.pennelinfo?.person_phone || this.phone || '';
  }
  private hydrateSiteItemsFromPanel() {
    this.installationItems = normalizeInstallationItems(this.pennelinfo?.installation_item);

    if (Array.isArray(this.pennelinfo?.content_civilitem)) {
      this.additionalItems = this.pennelinfo.content_civilitem.map((group: any) => ({
        name: String(group?.name ?? 'Additional Items'),
        items: Array.isArray(group?.items)
          ? group.items.map((item: any) => ({
              title: String(item?.title ?? ''),
              quantity: String(item?.quantity ?? ''),
            }))
          : [],
      }));
      return;
    }

    this.additionalItems = normalizeCivilItems(this.pennelinfo?.content_civilitem).map((group: any) => ({
      name: String(group?.title ?? 'Additional Items'),
      items: Array.isArray(group?.content)
        ? group.content.map((item: any) => ({
            title: String(item?.title ?? ''),
            quantity: String(item?.quantity ?? ''),
          }))
        : [],
    }));
  }
  async presentToast($msg) {
		const toast = await this.toastController.create({
		  message: $msg,
		  duration: 3000
		});
		toast.present();
	}
  nextpage(next: string) {
    const route = next.startsWith('/') ? next.slice(1) : next;
    /* Site info only needs panel data in localStorage — avoid queryParams until sendstep exists (was causing flaky first navigation). */
    if (route === 'siteinfo') {
      void this.router.navigate(['/siteinfo']);
      return;
    }
    const activeid = this.sendstep ?? this.data?.[0]?.step_id;
    void this.router.navigate(['/' + route], {
      queryParams: activeid != null && activeid !== '' ? { activeid } : {},
    });
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
      /* No step marked in progress yet — still need a step id for API calls */
      if ((this.sendstep == null || this.sendstep === '') && this.data?.length) {
        this.sendstep = this.data[0].step_id;
      }
      if ((!this.activeStep || this.activeStep.length === 0) && this.data?.length) {
        this.activePage = 1;
        this.activeStep = String(this.data[0].permission ?? '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
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

  async getCurrentCoordinates() {
  const loader = await this.loadingController.create({
    message: 'Getting current location...',
    spinner: 'crescent',
    backdropDismiss: false,
  });
  await loader.present();

  try {
    const allowed = await this.locationPermission.ensureLocationAllowed({ showRationale: true });

    if (!allowed) {
      await this.presentToast('Location permission is required to fetch coordinates.');
      return;
    }

    const resp = await this.geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });

    this.latitude = resp.coords.latitude;
    this.longitude = resp.coords.longitude;

    console.log('Coordinates:', this.latitude, this.longitude);

    await this.getAddress(this.latitude, this.longitude);
  } catch (error) {
    console.log('Error getting location', error);
    await this.presentToast('Unable to get current location. Please enable GPS and try again.');
  } finally {
    await loader.dismiss();
  }
}

async getAddress(lat: number, long: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(long)) {
    console.log('Invalid coordinates:', lat, long);
    await this.presentToast('Invalid coordinates received.');
    return;
  }

  try {
    const options = this.nativeGeocoderOptions || {
      useLocale: true,
      maxResults: 1
    };

    const res: NativeGeocoderResult[] = await this.nativeGeocoder.reverseGeocode(lat, long, options);

    console.log('Geocoder response:', res);

    if (res && res.length > 0) {
      this.address = this.pretifyAddress(res[0]);
      console.log('Resolved address:', this.address);
    } else {
      const fallbackAddress = await this.getAddressFromHttpFallback(lat, long);
      if (fallbackAddress) {
        this.address = fallbackAddress;
        return;
      }
      this.address = '';
      await this.presentToast('Coordinates found, but no address was returned.');
    }
  } catch (error: any) {
    console.log('Error getting address', error);

    const msg =
      typeof error === 'string'
        ? error
        : error?.message || JSON.stringify(error);

    const fallbackAddress = await this.getAddressFromHttpFallback(lat, long);
    if (fallbackAddress) {
      this.address = fallbackAddress;
      return;
    }

    if (msg.includes('Geocoder is not present on this device/emulator')) {
      await this.presentToast('Address lookup is not available on this device right now.');
    } else if (
      msg.toLowerCase().includes('grpc failed') ||
      msg.toLowerCase().includes('service not available') ||
      msg.toLowerCase().includes('no internet')
    ) {
      await this.presentToast('Address lookup failed. Please check internet connection and Google services.');
    } else if (msg.includes('Cannot get an address')) {
      await this.presentToast('Location found, but no readable address is available for these coordinates.');
    } else {
      await this.presentToast('Unable to get address from current location.');
    }
  }
}

private async getAddressFromHttpFallback(lat: number, long: number): Promise<string> {
  try {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', String(lat))
      .set('lon', String(long))
      .set('zoom', '18')
      .set('addressdetails', '1');

    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Accept-Language': 'en',
    });

    const response: any = await firstValueFrom(
      this.http.get('https://nominatim.openstreetmap.org/reverse', { params, headers }),
    );

    const displayName = (response?.display_name || '').trim();
    if (displayName.length > 0) {
      console.log('Resolved address via HTTP fallback:', displayName);
      return displayName;
    }
  } catch (fallbackError) {
    console.log('HTTP fallback reverse geocode failed', fallbackError);
  }

  return '';
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
    return data.slice(0, -2);
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
