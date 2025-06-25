import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsTable } from './stats-table';

describe('StatsTable', () => {
  let component: StatsTable;
  let fixture: ComponentFixture<StatsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatsTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
