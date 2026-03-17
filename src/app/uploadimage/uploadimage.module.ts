import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UploadimagePageRoutingModule } from './uploadimage-routing.module';

import { UploadimagePage } from './uploadimage.page';
import { FileUploadModule } from 'ng2-file-upload';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UploadimagePageRoutingModule,
    FileUploadModule
  ],
  declarations: [UploadimagePage]
})
export class UploadimagePageModule {}
