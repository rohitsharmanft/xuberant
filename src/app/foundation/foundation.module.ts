import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FoundationPageRoutingModule } from './foundation-routing.module';

import { FoundationPage } from './foundation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FoundationPageRoutingModule
  ],
  declarations: [FoundationPage]
})
export class FoundationPageModule {}
