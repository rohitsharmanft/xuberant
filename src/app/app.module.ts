import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { HttpClientModule } from '@angular/common/http';
import { File } from '@awesome-cordova-plugins/file/ngx';
// geolocation and native-geocoder
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { LocationAccuracy } from '@awesome-cordova-plugins/location-accuracy/ngx';
import { NativeGeocoder } from '@awesome-cordova-plugins/native-geocoder/ngx';
import { BarcodeScanner } from '@awesome-cordova-plugins/barcode-scanner/ngx';
import { PhotoViewer } from '@awesome-cordova-plugins/photo-viewer/ngx';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ImagePicker,
    PhotoViewer,
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
