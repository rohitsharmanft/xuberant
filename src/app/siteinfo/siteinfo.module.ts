import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SiteinfoPageRoutingModule } from './siteinfo-routing.module';

import { SiteinfoPage } from './siteinfo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SiteinfoPageRoutingModule
  ],
  declarations: [SiteinfoPage]
})
export class SiteinfoPageModule {}
