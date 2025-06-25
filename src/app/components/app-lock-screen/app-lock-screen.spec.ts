import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppLockScreen } from './app-lock-screen';

describe('AppLockScreen', () => {
  let component: AppLockScreen;
  let fixture: ComponentFixture<AppLockScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLockScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppLockScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
