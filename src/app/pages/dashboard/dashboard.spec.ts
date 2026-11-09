import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SheetApi } from '../../services/sheet-api.service';
import { Dashboard } from './dashboard';

describe('Dashboard.computeNextRun', () => {
  it('says "heute" on Tuesday morning', () => {
    const r = Dashboard.computeNextRun(new Date(2026, 10, 10, 9)); // Tue 10 Nov 2026
    expect(r).toEqual(jasmine.objectContaining({ relative: 'heute', soon: true }));
  });

  it('says "läuft gerade" during the run', () => {
    expect(Dashboard.computeNextRun(new Date(2026, 10, 10, 18, 30)).relative).toBe('läuft gerade');
  });

  it('jumps a week once the run is over', () => {
    expect(Dashboard.computeNextRun(new Date(2026, 10, 10, 19, 1)).relative).toBe('in 7 Tagen');
  });

  it('says "morgen" on Monday', () => {
    expect(Dashboard.computeNextRun(new Date(2026, 10, 9, 12)).relative).toBe('morgen');
  });
});

describe('Dashboard map lightbox', () => {
  let fixture: ComponentFixture<Dashboard>;
  const root = () => fixture.nativeElement as HTMLElement;
  const lightbox = () => root().querySelector('.map-lightbox');

  beforeEach(async () => {
    localStorage.clear();
    const api = jasmine.createSpyObj('SheetApi', ['get', 'post']);
    api.get.and.resolveTo({});
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: SheetApi, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  it('opens from the map card and closes with "Karte schließen"', () => {
    expect(lightbox()).toBeNull();

    root().querySelector<HTMLElement>('.map-card')!.click();
    fixture.detectChanges();
    expect(lightbox()).not.toBeNull();

    root().querySelector<HTMLElement>('.map-close')!.click();
    fixture.detectChanges();
    expect(lightbox()).toBeNull();
  });

  it('closes when clicking the backdrop or pressing Escape', () => {
    root().querySelector<HTMLElement>('.map-card')!.click();
    fixture.detectChanges();
    lightbox()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(lightbox()).toBeNull();

    root().querySelector<HTMLElement>('.map-card')!.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(lightbox()).toBeNull();
  });
});
