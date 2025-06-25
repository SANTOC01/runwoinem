import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingTable } from './ranking-table';

describe('RankingTable', () => {
  let component: RankingTable;
  let fixture: ComponentFixture<RankingTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RankingTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
