import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewworkPage } from './viewwork.page';

const routes: Routes = [
  {
    path: '',
    component: ViewworkPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewworkPageRoutingModule {}
