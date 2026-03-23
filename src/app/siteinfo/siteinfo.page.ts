import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  CivilItemView,
  normalizeCivilItems,
  normalizeInstallationItems,
} from '../../common/php-unserialize';

@Component({
  selector: 'app-siteinfo',
  templateUrl: './siteinfo.page.html',
  styleUrls: ['./siteinfo.page.scss'],
})
export class SiteinfoPage implements OnInit {
  logininfo: any = '';
  pennelinfo: any = '';
  /** Parsed from PHP-serialized strings or plain arrays */
  installationItems: { title: string; quantity: string }[] = [];
  civilItems: CivilItemView[] = [];

  constructor(private router: Router, public http: HttpClient) {}

  ngOnInit() {
    if (localStorage.getItem('authlogin') == '' || localStorage.getItem('authlogin') == null) {
      this.router.navigate(['/home']);
    }
    this.logininfo = JSON.parse(localStorage.getItem('authlogin') as string);
    this.pennelinfo = JSON.parse(localStorage.getItem('panel') as string);
    this.installationItems = normalizeInstallationItems(this.pennelinfo?.installation_item);
    this.civilItems = this.pennelinfo?.content_civilitem;
  }

  get isSiteTypeTwo(): boolean {
    return Number(this.pennelinfo?.site_type) === 2;
  }

  get beneficiaryName(): string {
    if (this.isSiteTypeTwo) {
      return this.pennelinfo?.person_name || '';
    }
    return this.pennelinfo?.siteinfo?.name || '';
  }

  get beneficiaryAddress(): string {
    if (this.isSiteTypeTwo) {
      return this.pennelinfo?.person_address || '';
    }
    return this.pennelinfo?.siteinfo?.address || '';
  }

  get beneficiaryPhone(): string {
    if (this.isSiteTypeTwo) {
      return this.pennelinfo?.person_phone || '';
    }
    return this.pennelinfo?.siteinfo?.phone || '';
  }
}
