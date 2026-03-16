import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { ImagePicker } from '@ionic-native/image-picker/ngx';
import { HttpClientModule } from '@angular/common/http';
import { Camera } from '@ionic-native/camera/ngx';
import { File } from '@ionic-native/file/ngx';
// geolocation and native-geocoder
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { NativeGeocoder } from '@ionic-native/native-geocoder/ngx';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ImagePicker,
    PhotoViewer,
    Camera,
    File,
    BarcodeScanner,
    AndroidPermissions,
    Geolocation,
    LocationAccuracy,
    NativeGeocoder,
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
