import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MarkPageRoutingModule } from './mark-routing.module';

import { MarkPage } from './mark.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MarkPageRoutingModule
  ],
  declarations: [MarkPage]
})
export class MarkPageModule {}
