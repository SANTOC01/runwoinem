import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppLoading } from './app-loading';

describe('AppLoading', () => {
  let component: AppLoading;
  let fixture: ComponentFixture<AppLoading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLoading]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppLoading);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
