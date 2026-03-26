import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular'; // Added Controllers
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; // Added Router
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GlobalConstants } from '../../common/global-constants';
@Component({
  selector: 'app-add-site',
  templateUrl: './add-site.page.html',
  styleUrls: ['./add-site.page.scss'],
})
export class AddSitePage implements OnInit, OnDestroy {
  currentStep: number = 1;
  
  // Search state
  customers: any[] = [];  
  isSearching: boolean = false;
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  companies: any[] = [];
siteTypes: string[] = [];  
installItems: any[] = [];
logininfo: any; 

  // Data model
  siteForm: any = {
    searchQuery: '',
    selectedCustomer: null,
    siteName: '',
    company: '',
    type: '',
    installationDate: new Date().toISOString(),
    installationItems: [{ category: '', quantity: 1 }],
    additionalItems: [
    {
      categoryName: '',  
      items: [
        { itemName: '', quantity: 1 }  
      ]
    }
  ]
  };
constructor(
  private navCtrl: NavController,
  private http: HttpClient,
  private router: Router,
  private loadingCtrl: LoadingController, // Check this name
  private toastCtrl: ToastController      // Check this name
) { }

  ngOnInit() {
    this.setupCustomerSearch();
  }

  // --- Step 1: Search Logic ---

  // This is the function the HTML was missing!
  onSearchInput(event: any) {
    const value = event.target.value;
    this.searchSubject.next(value);
  }
// Inside your AddSitePage class
get filteredInstallItems() {
  const selectedType = Number(this.siteForm.type); // ID 1 = Roof Top, ID 2 = Pump

  return this.installItems.filter(item => {
    // If Roof Top (1) is selected, hide Pump (ID 1)
    if (selectedType === 1 && item.id === 1) {
      return false;
    }

    // If Pump (2) is selected, hide Inverter (ID 3)
    if (selectedType === 2 && item.id === 3) {
      return false;
    }

    return true; // Show everything else
  });
}
  fetchStepTwoData() {
 
  this.http.get(GlobalConstants.installerStepTwo).subscribe({
    next: (res: any) => {
      if (res.success && res.data) {
        this.companies = res.data.companies;      
        this.siteTypes = res.data.type;          
        this.installItems = res.data.install_items;  
      }
    },
    error: (err) => {
      console.error("Step 2 API Error:", err);
    }
  });
}

  setupCustomerSearch() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.customers = [];
          return [];
        }console.log('term', term)
        this.isSearching = true;
        return this.http.get(`${GlobalConstants.searchCustomer}?keyword=${term}`);
      })
    ).subscribe({
      next: (res: any) => {
        this.isSearching = false;
        console.log('Server Response:', res);
        // Adjust 'res.data' based on your actual API response structure
        this.customers = res || []; 
      },
      error: (err) => {
        this.isSearching = false;
        console.error('Search error', err);
      }
    });
  }

// Update selectCustomer logic
selectCustomer(customer: any) {
  this.siteForm.selectedCustomer = customer;

  // Check if user already has an unassigned site
  if (customer.siteAssign === 'Y' && customer.siteInfo) {
    this.currentStep = 4; // New step for "Self Assign"
  } else {
    this.fetchStepTwoData(); 
    this.currentStep = 2; // Normal flow
  }
}

// Add the Self Assign Function
async selfAssignSite() {
  const loader = await this.loadingCtrl.create({ message: 'Assigning Site...' });
  await loader.present();

  // Get logged-in user ID
  this.logininfo = JSON.parse(localStorage.getItem('authlogin') || '{}');
  
  const payload = {
    siteid: this.siteForm.selectedCustomer.siteInfo.id,
    installid: this.logininfo.id
  };

  this.http.post(GlobalConstants.assignProject, payload).subscribe({
    next: async (res: any) => {
      await loader.dismiss();
      if (res.status || res.success) {
        const toast = await this.toastCtrl.create({ 
          message: 'Site Assigned Successfully!', 
          duration: 2000, 
          color: 'success' 
        });
        toast.present();
        this.navCtrl.back();  
      }
    },
    error: async (err) => {
      await loader.dismiss();
      const toast = await this.toastCtrl.create({ 
        message: 'Assignment Failed.', 
        duration: 2000, 
        color: 'danger' 
      });
      toast.present();
    }
  });
}

  // --- Step 3: Dynamic Item Management ---

  addItemToCategory(catIdx: number) {
    this.siteForm.additionalItems[catIdx].items.push({ 
      itemName: '', 
      quantity: 1 
    });
  }

  removeItemFromCategory(catIdx: number, rowIdx: number) {
    if (this.siteForm.additionalItems[catIdx].items.length > 1) {
      this.siteForm.additionalItems[catIdx].items.splice(rowIdx, 1);
    }
  }

  addInstallationItem() {
    this.siteForm.installationItems.push({ category: '', quantity: 1 });
  }

  removeInstallationItem(index: number) {
    this.siteForm.installationItems.splice(index, 1);
  }

  addAdditionalCategory() {
    this.siteForm.additionalItems.push({
      categoryName: '',
      items: [{ itemName: '', quantity: 1 }]
    });
  }

  removeAdditionalCategory(index: number) {
    this.siteForm.additionalItems.splice(index, 1);
  }

  // --- Navigation ---

  nextStep() {
    if (this.currentStep < 3) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }


async submitForm() {
  const loader = await this.loadingCtrl.create({ message: 'Saving Site...' });
  await loader.present();

  this.logininfo = JSON.parse(localStorage.getItem('authlogin') || '{}');

  const payload = {
    site_type: "install",
    project_id: this.siteForm.companyId,  
    type_id: this.siteForm.type,        
    name: this.siteForm.siteName,
    delivery_date: this.siteForm.installationDate.split('T')[0],
    description: null,
    
    // Installation Items (Parallel Arrays)
    installationitem: this.siteForm.installationItems.map(i => i.category),
    installationquantity: this.siteForm.installationItems.map(i => i.quantity),

    // Customer
    customer_id: this.siteForm.selectedCustomer?.id,
    // ucid: this.siteForm.selectedCustomer?.ucid,
    // person_name: this.siteForm.selectedCustomer?.person_name,
    // person_phone: this.siteForm.selectedCustomer?.person_phone,
    // person_address: this.siteForm.selectedCustomer?.person_address,
    // person_note: "test",

    // Staff
    installation_staff_id: this.logininfo.id,

    // Civil Items (Nested Arrays)
    civil_item_name: this.siteForm.additionalItems.map(cat => cat.categoryName),
    item: this.siteForm.additionalItems.map(cat => cat.items.map(row => row.itemName)),
    quantity: this.siteForm.additionalItems.map(cat => cat.items.map(row => row.quantity)),
    
    mobile_gallery: "0"
  };

  this.http.post(GlobalConstants.saveSite, payload).subscribe({
    next: async (res: any) => {
      await loader.dismiss();
      if (res.status || res.success) {
        const toast = await this.toastCtrl.create({ message: 'Site Stored Successfully', duration: 2000, color: 'success' });
        toast.present();
        this.navCtrl.back();
      }
    },
    error: async (err) => {
      await loader.dismiss();
      console.log('Error details:', err);
      const toast = await this.toastCtrl.create({ message: 'Submission Failed.', duration: 2000, color: 'danger' });
      toast.present();
    }
  });
}

  // Always clean up subscriptions to prevent memory leaks
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
  // add-site.page.ts
onAdditionalCategoryInput(event: any, catIdx: number) {
  const keyword = event.target.value;
  if (keyword.length < 1) {
    this.siteForm.additionalItems[catIdx].searchResults = [];
    return;
  }

  // Reuse your debounce logic or a simple timer
  this.http.get(`${GlobalConstants.searchCivilAndItems}?keyword=${keyword}`)
    .subscribe((res: any) => {
      if (res.status) {
        this.siteForm.additionalItems[catIdx].searchResults = res.civil_list;
      }
    });
}

selectCivilCategory(category: any, catIdx: number) {
  // Update category name and ID
  this.siteForm.additionalItems[catIdx].categoryName = category.label;
  this.siteForm.additionalItems[catIdx].civilId = category.id;
  this.siteForm.additionalItems[catIdx].searchResults = []; // Clear suggestions

  // Hit the API again with the ID to get the child items
  this.http.get(`${GlobalConstants.searchCivilAndItems}?keyword=${category.label}&id=${category.id}`)
    .subscribe((res: any) => {
      if (res.status && res.items) {
        // Map the items directly into the rows
        this.siteForm.additionalItems[catIdx].items = res.items.map((apiItem: any) => ({
          itemName: apiItem.item_name,
          quantity: apiItem.quantity
        }));
      }
    });
}
}