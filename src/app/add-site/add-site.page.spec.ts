import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddSitePage } from './add-site.page';

describe('AddSitePage', () => {
  let component: AddSitePage;
  let fixture: ComponentFixture<AddSitePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSitePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
