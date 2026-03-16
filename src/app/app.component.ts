import { Component } from '@angular/core';
import{ GlobalConstants } from '../common/global-constants';
import { Router } from '@angular/router'
import { Platform, AlertController } from '@ionic/angular';
import { Location } from '@angular/common';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Coordinates, Geolocation } from '@ionic-native/geolocation/ngx';


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
  constructor(private router: Router,private platform: Platform,public alertController: AlertController,
    private _location: Location,private androidPermissions: AndroidPermissions,
    private geolocation: Geolocation,
    private locationAccuracy: LocationAccuracy    ) {
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
    setInterval(()=> {
      this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
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
    this.requestGPSPermission()
    this.askToTurnOnGPS()
    
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

  requestGPSPermission() {
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        console.log("4");
      } else {
        //Show 'GPS Permission Request' dialogue
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(
            () => {
              // call method to turn on GPS
              this.askToTurnOnGPS();
            },
            error => {
              //Show alert if user click on 'No Thanks'
              alert('requestPermission Error requesting location permissions ' + error)
            }
          );
      }
    });
  }
  askToTurnOnGPS() {
      
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
          () => {
        
          },
          error => alert('Error requesting location permissions ' + JSON.stringify(error))
        );
      } else {
        //Show 'GPS Permission Request' dialogue
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(
            () => {
              // call method to turn on GPS
              this.askToTurnOnGPS();
            },
            error => {
              //Show alert if user click on 'No Thanks'
              alert('requestPermission Error requesting location permissions ' + error)
            }
          );
      }
    });
  }

 
}
