import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FoundationPage } from './foundation.page';

const routes: Routes = [
  {
    path: '',
    component: FoundationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FoundationPageRoutingModule {}
