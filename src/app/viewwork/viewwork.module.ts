import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewworkPageRoutingModule } from './viewwork-routing.module';

import { ViewworkPage } from './viewwork.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewworkPageRoutingModule
  ],
  declarations: [ViewworkPage]
})
export class ViewworkPageModule {}
