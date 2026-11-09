import { ChallengeEntry } from '../interfaces/challenge.interface';
import { detectRankUp, detectRecords, nextTarget, streaksByName } from './challenge-utils';

const r = (...pairs: [string, number][]) => pairs.map(([name, value]) => ({ name, value }));
/** Local-time entry so week boundaries don't depend on the machine's timezone. */
const e = (name: string, value: number, day: string): ChallengeEntry => ({ name, value, date: `${day}T12:00:00` });

describe('nextTarget', () => {
  const rankings = r(['Anna', 50], ['Ben', 40], ['Cleo', 40]);

  it('needs one more than the gap to pass the person ahead', () => {
    expect(nextTarget(rankings, 'Ben')).toEqual({ name: 'Anna', place: 1, needed: 11 });
  });

  it('needs only 1 when tied', () => {
    expect(nextTarget(rankings, 'Cleo')).toEqual({ name: 'Ben', place: 2, needed: 1 });
  });

  it('is null for first place and unknown names', () => {
    expect(nextTarget(rankings, 'Anna')).toBeNull();
    expect(nextTarget(rankings, 'Nobody')).toBeNull();
  });
});

describe('detectRecords', () => {
  // 2026-11-02 and 2026-11-09 are Mondays, 2026-11-10 is a Tuesday.
  const history = [e('Anna', 10, '2026-11-02'), e('Anna', 12, '2026-11-03'), e('Ben', 99, '2026-11-02')];

  it('reports a new longest run', () => {
    const after = [...history, e('Anna', 15, '2026-11-09')];
    expect(detectRecords(history, after, 'Anna', [])).toEqual([{ kind: 'longest', value: 15 }]);
  });

  it('does not report a run that is not the longest', () => {
    const after = [...history, e('Anna', 5, '2026-11-09')];
    expect(detectRecords(history, after, 'Anna', [])).toEqual([]);
  });

  it('reports a best week only when the week passes the old best', () => {
    // Best week so far: 22 km. A 20 km week is not a record yet ...
    const week2 = [...history, e('Anna', 11, '2026-11-09')]; // 11, longest unchanged (12)
    expect(detectRecords(history, week2, 'Anna', [])).toEqual([]);
    // ... but passing it is, and the next entry in the same week is not announced again.
    const week2b = [...week2, e('Anna', 12, '2026-11-10')]; // week total 23 > 22
    expect(detectRecords(week2, week2b, 'Anna', [])).toEqual([{ kind: 'bestWeek', value: 23 }]);
    const week2c = [...week2b, e('Anna', 1, '2026-11-11')]; // 24, already past the old best
    expect(detectRecords(week2b, week2c, 'Anna', [])).toEqual([]);
  });

  it('reports the highest milestone crossed, once', () => {
    const after = [...history, e('Anna', 11, '2026-11-09')]; // total 22 -> 33
    expect(detectRecords(history, after, 'Anna', [25, 30, 50])).toEqual([{ kind: 'milestone', value: 30 }]);
    const more = [...after, e('Anna', 1, '2026-11-09')];
    expect(detectRecords(after, more, 'Anna', [25, 30, 50])).toEqual([]);
  });

  it('never counts the very first entry as a longest run or best week', () => {
    expect(detectRecords([], [e('Zoe', 20, '2026-11-02')], 'Zoe', [50])).toEqual([]);
  });

  it('ignores deletions', () => {
    expect(detectRecords(history, history.slice(1), 'Anna', [5])).toEqual([]);
  });
});

describe('streaksByName', () => {
  const now = new Date('2026-11-11T12:00:00'); // Wednesday of the week starting 2026-11-09

  it('counts consecutive weeks, with the current week optional', () => {
    const entries = [
      e('Anna', 5, '2026-11-02'),
      e('Anna', 5, '2026-10-27'),
      e('Anna', 5, '2026-10-20'),
      e('Ben', 5, '2026-11-10'),
      e('Ben', 5, '2026-11-03'),
    ];
    const streaks = streaksByName(entries, now);
    expect(streaks.get('Anna')).toBe(3); // current week empty, previous three weeks run
    expect(streaks.get('Ben')).toBe(2);
  });

  it('is broken by a missing week', () => {
    const entries = [e('Cleo', 5, '2026-11-10'), e('Cleo', 5, '2026-10-20')];
    expect(streaksByName(entries, now).get('Cleo')).toBe(1);
  });

  it('is 0 when the last run is older than last week', () => {
    expect(streaksByName([e('Dan', 5, '2026-10-20')], now).get('Dan')).toBe(0);
  });
});

describe('detectRankUp', () => {
  it('reports places climbed and who was overtaken', () => {
    const before = r(['Anna', 50], ['Ben', 40], ['Cleo', 30], ['Dan', 20]);
    const after = r(['Anna', 50], ['Dan', 45], ['Ben', 40], ['Cleo', 30]);
    expect(detectRankUp(before, after, 'Dan')).toEqual({ name: 'Dan', from: 4, to: 2, overtaken: ['Ben', 'Cleo'] });
  });

  it('returns null when the place does not change', () => {
    const before = r(['Anna', 50], ['Ben', 40]);
    const after = r(['Anna', 50], ['Ben', 45]);
    expect(detectRankUp(before, after, 'Ben')).toBeNull();
  });

  it('treats a newcomer as climbing past everyone below them', () => {
    const before = r(['Anna', 50], ['Ben', 10]);
    const after = r(['Anna', 50], ['Eve', 20], ['Ben', 10]);
    expect(detectRankUp(before, after, 'Eve')).toEqual({ name: 'Eve', from: null, to: 2, overtaken: ['Ben'] });
  });

  it('returns null for a newcomer in last place', () => {
    const before = r(['Anna', 50]);
    const after = r(['Anna', 50], ['Eve', 5]);
    expect(detectRankUp(before, after, 'Eve')).toBeNull();
  });
});
