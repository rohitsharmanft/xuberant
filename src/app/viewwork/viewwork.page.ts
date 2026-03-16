import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'
import{ GlobalConstants } from '../../common/global-constants';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';

@Component({
  selector: 'app-viewwork',
  templateUrl: './viewwork.page.html',
  styleUrls: ['./viewwork.page.scss'],
})
export class ViewworkPage implements OnInit {
  logininfo: any = ''
  pennelinfo: any = ''
  daylist: any =''
  imageurl: any =''
  constructor(private router: Router,public http: HttpClient,private photoViewer: PhotoViewer) { }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))

    this.http.get(GlobalConstants.daylist+''+this.pennelinfo.id)
		.subscribe((res: any) => {
        this.daylist = res.data
        this.imageurl = res.imageurl
		}, error => {
			console.log(error);
		});
  }
   //View only photo 
  viewPhoto(img){
    this.photoViewer.show(this.imageurl+img);
  }
}
