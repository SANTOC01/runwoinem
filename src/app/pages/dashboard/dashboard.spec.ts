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
