import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SiteinfoPage } from './siteinfo.page';

const routes: Routes = [
  {
    path: '',
    component: SiteinfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SiteinfoPageRoutingModule {}
