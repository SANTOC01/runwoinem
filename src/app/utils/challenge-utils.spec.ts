import { ChallengeEntry } from '../interfaces/challenge.interface';
import {
  badgesFor,
  crossedStop,
  detectRankUp,
  detectRecords,
  longestStreak,
  nextStop,
  nextTarget,
  streaksByName,
  weekTotal,
  rollingWeekTrend,
  runDayOptions,
  trendChange,
  weekStart,
} from './challenge-utils';

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

describe('longestStreak', () => {
  it('finds the longest run of consecutive weeks, ignoring order and duplicates', () => {
    const w = weekStart(new Date('2026-11-02T12:00:00'));
    expect(longestStreak([w, w - 7, w - 14, w - 35, w - 42, w])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe('crossedStop', () => {
  const stops = [
    { name: 'Weinheim', emoji: '🏁', cumulativeKm: 0 },
    { name: 'Köln', cumulativeKm: 190 },
    { name: 'Paris', emoji: '🗼', cumulativeKm: 690 },
  ];

  it('returns the furthest stop passed', () => {
    expect(crossedStop(180, 200, stops, 1000)).toEqual({ name: 'Köln', emoji: '📍', finish: false });
    expect(crossedStop(180, 700, stops, 1000)).toEqual({ name: 'Paris', emoji: '🗼', finish: false });
  });

  it('counts landing exactly on a stop, but not starting on it', () => {
    expect(crossedStop(100, 190, stops, 1000)?.name).toBe('Köln');
    expect(crossedStop(190, 200, stops, 1000)).toBeNull();
  });

  it('reports finishing the lap', () => {
    expect(crossedStop(990, 1005, stops, 1000)).toEqual({ name: 'Weinheim', emoji: '🏆', finish: true });
  });

  it('is null when nothing was passed or the total went down', () => {
    expect(crossedStop(0, 50, stops, 1000)).toBeNull();
    expect(crossedStop(700, 600, stops, 1000)).toBeNull();
  });
});

describe('badgesFor', () => {
  const earned = (entries: ChallengeEntry[], unit = 'km') =>
    badgesFor(entries, unit)
      .filter((b) => b.earned)
      .map((b) => b.label);

  it('awards run count, long-run and Tuesday badges', () => {
    // 2026-10-06 .. 2026-11-03 are five Tuesdays in five consecutive weeks.
    const tuesdays = ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03'];
    const entries = [...tuesdays.map((d) => e('Anna', 5, d)), e('Anna', 22, '2026-11-05')];
    expect(earned(entries)).toEqual(['Erster Schritt', 'Waidsee-Stammgast', 'Am Ball', 'Halbmarathon']);
  });

  it('leaves out distance badges for non-km challenges', () => {
    const labels = badgesFor([e('Anna', 500, '2026-11-05')], 'HM').map((b) => b.label);
    expect(labels).not.toContain('Marathon');
    expect(earned([e('Anna', 500, '2026-11-05')], 'HM')).toEqual(['Erster Schritt']);
  });
});

describe('detectRecords: beating last week', () => {
  // Week of 2026-10-26: 30 (best week), week of 2026-11-02: 10, this week (2026-11-09): 6 so far.
  const before = [e('Anna', 30, '2026-10-26'), e('Anna', 10, '2026-11-02'), e('Anna', 6, '2026-11-09')];

  it('fires once when this week passes last week', () => {
    const after = [...before, e('Anna', 6, '2026-11-10')];
    expect(detectRecords(before, after, 'Anna', [])).toEqual([{ kind: 'beatLastWeek', value: 10 }]);

    const later = [...after, e('Anna', 3, '2026-11-11')];
    expect(detectRecords(after, later, 'Anna', [])).toEqual([]);
  });

  it('is replaced by the best-week record when both apply', () => {
    const after = [...before, e('Anna', 26, '2026-11-10')];
    expect(detectRecords(before, after, 'Anna', []).map((h) => h.kind)).toEqual(['bestWeek']);
  });
});

describe('nextStop', () => {
  const stops = [
    { name: 'Weinheim', cumulativeKm: 0 },
    { name: 'Köln', cumulativeKm: 190 },
    { name: 'Paris', cumulativeKm: 690 },
  ];

  it('returns the next stop and the distance to it', () => {
    expect(nextStop(100, stops, 1000)).toEqual({ name: 'Köln', remaining: 90 });
    expect(nextStop(190, stops, 1000)).toEqual({ name: 'Paris', remaining: 500 });
  });

  it('leads back to the start after the last stop and ends with the lap', () => {
    expect(nextStop(700, stops, 1000)).toEqual({ name: 'Weinheim', remaining: 300 });
    expect(nextStop(1000, stops, 1000)).toBeNull();
  });
});

describe('weekTotal', () => {
  it("sums everyone's entries of the current week only", () => {
    const now = new Date('2026-11-12T12:00:00'); // Thursday, week starts Mon 2026-11-09
    const entries = [
      e('Anna', 10, '2026-11-09'),
      e('Ben', 8, '2026-11-10'),
      e('Anna', 99, '2026-11-08'), // Sunday of the previous week
    ];
    expect(weekTotal(entries, now)).toBe(18);
  });
});

describe('runDayOptions', () => {
  it('offers today, yesterday and five earlier days as local dates', () => {
    const options = runDayOptions(new Date('2026-11-12T08:00:00'));
    expect(options.length).toBe(7);
    expect(options[0]).toEqual({ value: '', label: 'Heute' });
    expect(options[1]).toEqual({ value: '2026-11-11', label: 'Gestern' });
    expect(options[2].value).toBe('2026-11-10');
    expect(options[2].label).toContain('10.11.');
    expect(options[6].value).toBe('2026-11-06');
  });
});

describe('rollingWeekTrend / trendChange', () => {
  const now = new Date('2026-11-14T09:00:00'); // Saturday

  it('sums the 7 days ending on each day', () => {
    const entries = [
      e('Anna', 10, '2026-11-14'), // today
      e('Ben', 5, '2026-11-08'), // 6 days ago: still in today's window
      e('Ben', 7, '2026-11-07'), // 7 days ago: only in earlier windows
      e('Cleo', 99, '2026-12-01'), // future: ignored
    ];
    const trend = rollingWeekTrend(entries, now, 14);
    expect(trend.length).toBe(14);
    expect(trend[13].value).toBe(15);
    expect(trend[12].value).toBe(12); // window 11-07 .. 11-13
    expect(trend[13].date.getDate()).toBe(14);
    expect(trend[0].date.getDate()).toBe(1);
  });

  it('compares the last 7 days with the 7 before', () => {
    const entries = [e('Anna', 30, '2026-11-12'), e('Anna', 10, '2026-11-05')];
    expect(trendChange(rollingWeekTrend(entries, now, 14))).toEqual({ last7: 30, previous7: 10, delta: 20 });
    expect(trendChange(rollingWeekTrend(entries, now, 7))).toBeNull();
  });
});
