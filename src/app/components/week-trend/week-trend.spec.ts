import { TestBed } from '@angular/core/testing';
import { WeekTrend } from './week-trend';

describe('WeekTrend', () => {
  it('draws the line from 0 and reads out the latest and the hovered day', () => {
    const fixture = TestBed.createComponent(WeekTrend);
    fixture.componentRef.setInput('points', [
      { date: new Date(2026, 10, 12), value: 0 },
      { date: new Date(2026, 10, 13), value: 20 },
      { date: new Date(2026, 10, 14), value: 40 },
    ]);
    fixture.componentRef.setInput('unit', 'km');
    fixture.detectChanges();
    const trend = fixture.componentInstance;

    expect(trend.linePath()).toBe('M4.0,36.0 L84.0,20.0 L164.0,4.0');
    expect(trend.readout()).toBe('Letzte 7 Tage: 40 km');

    trend.hovered.set(1);
    expect(trend.readout()).toContain('7 Tage bis');
    expect(trend.readout()).toContain(': 20 km');
    expect(trend.ariaLabel()).toContain('von 0 auf 40 km');
  });
});
