import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SubmitProgress } from './submit-progress';
import { SaveState } from '../../interfaces/challenge.interface';

describe('SubmitProgress', () => {
  let fixture: ComponentFixture<SubmitProgress>;
  const setState = (state: SaveState) => {
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmitProgress);
    fixture.detectChanges();
  });

  it('shows while saving, confirms, then hides', fakeAsync(() => {
    expect(fixture.componentInstance.phase()).toBe('hidden');

    setState('saving');
    expect(text()).toContain('Dein Lauf wird eingetragen');
    tick(2500);
    fixture.detectChanges();
    expect(text()).toContain('Fast geschafft');

    setState('done');
    expect(text()).toContain('Eingetragen!');
    tick(900);
    fixture.detectChanges();
    expect(fixture.componentInstance.phase()).toBe('hidden');
  }));

  it('hides right away on errors and ignores a stale "done"', fakeAsync(() => {
    setState('done');
    expect(fixture.componentInstance.phase()).toBe('hidden');

    setState('saving');
    setState('error');
    expect(fixture.componentInstance.phase()).toBe('hidden');
    tick(10_000);
  }));

  it('asks before closing the tab only while saving', fakeAsync(() => {
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    fixture.componentInstance.onBeforeUnload(event);
    expect(event.defaultPrevented).toBeFalse();

    setState('saving');
    fixture.componentInstance.onBeforeUnload(event);
    expect(event.defaultPrevented).toBeTrue();
    setState('error');
  }));
});
