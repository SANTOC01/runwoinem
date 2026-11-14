import { AppEvent } from '../models/app-event';
import { classifyDistance, matchesFilter } from './event-utils';

const event = (dist: string): AppEvent => ({ name: 'x', dist, date: '2026-01-01', daysLeft: 1 });

describe('classifyDistance', () => {
  it('does not count a half marathon as a marathon', () => {
    expect(classifyDistance('Halbmarathon')).toBe('Halbmarathon');
    expect(classifyDistance('Halb-Marathon')).toBe('Halbmarathon');
    expect(classifyDistance('Marathon')).toBe('Marathon');
    expect(classifyDistance('42,2 km')).toBe('Marathon');
  });

  it('is fuzzy: 42–44 km is a marathon and 21–23 km a half marathon', () => {
    for (const km of ['42 km', '43 km', '44km', '44,8 km']) expect(classifyDistance(km)).toBe('Marathon');
    for (const km of ['21 km', '22 km', '23km']) expect(classifyDistance(km)).toBe('Halbmarathon');
    expect(classifyDistance('41 km')).toBeNull();
    expect(classifyDistance('45 km')).toBeNull();
    expect(classifyDistance('24 km')).toBeNull();
  });

  it('does not read 15 or 25 km as 5 km', () => {
    expect(classifyDistance('15km')).toBeNull();
    expect(classifyDistance('25 km')).toBeNull();
    expect(classifyDistance('5km')).toBe('5KM');
    expect(classifyDistance('5 km')).toBe('5KM');
    expect(classifyDistance('10km')).toBe('10KM');
  });

  it('understands the emoji markers', () => {
    expect(classifyDistance('⚫')).toBe('Marathon');
    expect(classifyDistance('🔴 ⛰️')).toBe('Halbmarathon');
    expect(classifyDistance('🟡')).toBe('10KM');
    expect(classifyDistance('🟢')).toBe('5KM');
    expect(classifyDistance('🌄')).toBe('Trail');
  });

  it('puts trail first and sorts custom distances by km', () => {
    expect(classifyDistance('Trail 21 km')).toBe('Trail');
    expect(classifyDistance('Lauf (3,5)')).toBeNull();
    expect(classifyDistance('Lauf (5,5)')).toBe('5KM');
    expect(classifyDistance('Lauf (12.5)')).toBe('10KM');
    expect(classifyDistance('Lauf (21,1)')).toBe('Halbmarathon');
  });
});

describe('matchesFilter', () => {
  it('shows everything under "Alle" and only the matching category otherwise', () => {
    expect(matchesFilter(event('Halbmarathon'), 'Alle')).toBeTrue();
    expect(matchesFilter(event('Halbmarathon'), 'Marathon')).toBeFalse();
    expect(matchesFilter(event('Halbmarathon'), 'Halbmarathon')).toBeTrue();
  });
});
