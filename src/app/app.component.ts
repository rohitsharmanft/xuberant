import { Component } from '@angular/core';
import{ GlobalConstants } from '../common/global-constants';
import { Router } from '@angular/router'
import { Platform, AlertController } from '@ionic/angular';
import { Location } from '@angular/common';
import { LocationPermissionService } from './services/location-permission.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  logininfo: any = ''
  backoption: any = ''
  locationCoords: any
  timetest: any
  constructor(
    private router: Router,
    private platform: Platform,
    public alertController: AlertController,
    private _location: Location,
    private locationPermission: LocationPermissionService,
  ) {
    this.initializeApp();
    

    this.locationCoords = {
      latitude: "",
      longitude: "",
      accuracy: "",
      timestamp: ""
    }
    this.timetest = Date.now();
  }
  ngOnInit() {
    this.syncLoginInfoFromStorage();
    setInterval(() => {
      this.syncLoginInfoFromStorage();
    }, 1000);
    setInterval(()=> {
	  if (this._location.isCurrentPathEqualTo('/home')) {
		if(localStorage.getItem('authlogin') != '' && localStorage.getItem('authlogin') != null){
			localStorage.setItem('refreshpage', 'Yes')
			this.router.navigate(['/dashboard']);
		}  
	  }
      if (this._location.isCurrentPathEqualTo('/dashboard')) {
        this.backoption = false
      }else{
        this.backoption = true
      }
    }, 100);
    void this.platform.ready().then(() => this.locationPermission.promptOnLaunchIfNeeded());
  }
  logout() {

    this.alertController.create({
      header: 'Xuberant Solutions',
      message: 'Do you want to logout this app?',
      backdropDismiss: false,
      buttons: [{
        text: 'No',
        role: 'cancel',
        handler: () => {
          console.log('Application exit prevented!');
        }
      }, {
        text: 'Yes',
        handler: () => {
          GlobalConstants.logout();
          this.router.navigate(['/home']);
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
    
  }
  initializeApp() {
    this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
      console.log('Back press handler!');
      if (this._location.isCurrentPathEqualTo('/dashboard') || this._location.isCurrentPathEqualTo('/home')) {

        // Show Exit Alert!
        console.log('Show Exit Alert!');
        this.showExitConfirm();
        processNextHandler();
      } else {

        // Navigate to back page
        console.log('Navigate to back page');
        this._location.back();

      }

    });

    this.platform.backButton.subscribeWithPriority(5, () => {
      console.log('Handler called to force close!');
      this.alertController.getTop().then(r => {
        if (r) {
          navigator['app'].exitApp();
        }
      }).catch(e => {
        console.log(e);
      })
    });

  }

  showExitConfirm() {
    this.alertController.create({
      header: 'Xuberant Solutions',
      message: 'Do you want to close the app?',
      backdropDismiss: false,
      buttons: [{
        text: 'Stay',
        role: 'cancel',
        handler: () => {
          console.log('Application exit prevented!');
        }
      }, {
        text: 'Exit',
        handler: () => {
          navigator['app'].exitApp();
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
  }
  myBackButton(){
    this._location.back();
  }

  /** Keep header in sync with storage; safe when auth key is missing after logout. */
  private syncLoginInfoFromStorage(): void {
    const raw = localStorage.getItem('authlogin');
    if (raw == null || raw === '') {
      this.logininfo = null;
      return;
    }
    try {
      this.logininfo = JSON.parse(raw);
    } catch {
      this.logininfo = null;
    }
  }

}
