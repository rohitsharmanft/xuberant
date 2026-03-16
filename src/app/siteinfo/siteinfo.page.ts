import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'

@Component({
  selector: 'app-siteinfo',
  templateUrl: './siteinfo.page.html',
  styleUrls: ['./siteinfo.page.scss'],
})
export class SiteinfoPage implements OnInit {
  logininfo: any = ''
  pennelinfo: any = ''
  constructor(private router: Router,public http: HttpClient) { }

  ngOnInit() {
    if(localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null){
			this.router.navigate(['/home']);
		}
    this.logininfo = JSON.parse(localStorage.getItem('authlogin'))
    this.pennelinfo = JSON.parse(localStorage.getItem('panel'))
    console.log(this.pennelinfo)
  }

}
