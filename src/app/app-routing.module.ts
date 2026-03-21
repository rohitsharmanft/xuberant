import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { GlobalConstants } from '../common/global-constants';

const defaultEntry = GlobalConstants.skipLoginAndOtp ? 'dashboard' : 'home';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: defaultEntry,
    pathMatch: 'full'
  },
  {
    path: 'otp',
    loadChildren: () => import('./otp/otp.module').then( m => m.OtpPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'info',
    loadChildren: () => import('./info/info.module').then( m => m.InfoPageModule)
  },
  {
    path: 'uploadimage',
    loadChildren: () => import('./uploadimage/uploadimage.module').then( m => m.UploadimagePageModule)
  },
  {
    path: 'scan',
    loadChildren: () => import('./scan/scan.module').then( m => m.ScanPageModule)
  },
  {
    path: 'siteinfo',
    loadChildren: () => import('./siteinfo/siteinfo.module').then( m => m.SiteinfoPageModule)
  },
  {
    path: 'mark',
    loadChildren: () => import('./mark/mark.module').then( m => m.MarkPageModule)
  },
  {
    path: 'viewwork',
    loadChildren: () => import('./viewwork/viewwork.module').then( m => m.ViewworkPageModule)
  },
  {
    path: 'foundation',
    loadChildren: () => import('./foundation/foundation.module').then( m => m.FoundationPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
