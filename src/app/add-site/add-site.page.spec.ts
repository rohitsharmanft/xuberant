import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { GlobalConstants } from '../../common/global-constants';

@Component({
  selector: 'app-add-site',
  templateUrl: './add-site.page.html',
  styleUrls: ['./add-site.page.scss'],
})
export class AddSitePage implements OnInit, OnDestroy {
  currentStep = 1;
  customers: any[] = [];
  isSearching = false;
  
  // Search stream management
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.setupCustomerSearch();
  }

  setupCustomerSearch() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),          // Wait for user to stop typing
      distinctUntilChanged(),     // Only search if text actually changed
      switchMap(term => {
        if (!term.trim()) {
          this.customers = [];
          return [];
        }
        this.isSearching = true;
        // Hit the new endpoint: .../searchcustomer?keyword=term
        return this.http.get(`${GlobalConstants.searchCustomer}?keyword=${term}`).pipe(
          finalize(() => this.isSearching = false)
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (res.status === 200) {
          this.customers = res.data; // Assuming your API returns { data: [] }
        }
      },
      error: (err) => {
        console.error('Search failed', err);
        this.isSearching = false;
        this.setupCustomerSearch(); // Restart stream on error
      }
    });
  }

  onSearchInput(event: any) {
    const val = event.target.value;
    this.searchSubject.next(val);
  }

  selectCustomer(customer: any) {
    console.log('Selected:', customer);
    // Store selected customer info in your siteForm here
    this.currentStep = 2; // Move to next step automatically
  }

  ngOnDestroy() {
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
  }
}