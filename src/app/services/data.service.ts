import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  data: string;
  constructor() { }
  
  setData(data) {
	this.data = data;
  }
  
  getData(){
    return this.data;
  }
 
}
