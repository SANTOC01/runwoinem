import {
  Arrival,
  Badge,
  ChallengeEntry,
  ChallengeRanking,
  NextStop,
  NextTarget,
  RankUp,
  RecordHit,
  WeekLeader,
  WeekRiser,
} from '../interfaces/challenge.interface';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 (local) of the week containing the date, as a day number. */
export function weekStart(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Mon = 0
  return Math.round((d.getTime() - offset * DAY_MS) / DAY_MS);
}

/** Summed value per week (keyed by `weekStart`) for entries of a single person. */
export function weeklyTotals(entries: ChallengeEntry[]): Map<number, number> {
  const weeks = new Map<number, number>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) continue;
    const wk = weekStart(d);
    weeks.set(wk, (weeks.get(wk) ?? 0) + e.value);
  }
  return weeks;
}

/**
 * Consecutive weeks (ending now) with at least one entry. The current week may
 * still be empty without breaking the streak.
 */
export function streakFromWeeks(weeks: { has(week: number): boolean }, now = new Date()): number {
  const thisWeek = weekStart(now);
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 7;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor -= 7;
  }
  return streak;
}

/** Current weekly streak for every person in the entries. */
export function streaksByName(entries: ChallengeEntry[], now = new Date()): Map<string, number> {
  const weeksByName = new Map<string, Set<number>>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) continue;
    const weeks = weeksByName.get(e.name) ?? new Set<number>();
    weeks.add(weekStart(d));
    weeksByName.set(e.name, weeks);
  }
  return new Map([...weeksByName].map(([name, weeks]) => [name, streakFromWeeks(weeks, now)]));
}

/** Longest run of consecutive weeks ever (not only the current streak). */
export function longestStreak(weeks: Iterable<number>): number {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((week, i) => {
    run = i > 0 && week - sorted[i - 1] === 7 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/**
 * This week's sum for everyone together and the person with the most (null if nobody logged yet).
 * Names in `notLeader` count for the total but are never picked as leader.
 */
export function thisWeek(
  entries: ChallengeEntry[],
  now = new Date(),
  notLeader: readonly string[] = [],
): { total: number; leader: WeekLeader | null } {
  const skip = new Set(notLeader.map(normName));
  const week = weekStart(now);
  const perName = new Map<string, number>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime()) || weekStart(d) !== week) continue;
    perName.set(e.name, (perName.get(e.name) ?? 0) + e.value);
  }
  let total = 0;
  let leader: WeekLeader | null = null;
  for (const [name, value] of perName) {
    total += value;
    if (skip.has(normName(name))) continue;
    if (value > 0 && (!leader || value > leader.value)) leader = { name, value };
  }
  return { total, leader };
}

const normName = (name: string) => name.trim().toLowerCase();

/** How many past weeks count towards someone's usual week. */
const RISER_LOOKBACK_WEEKS = 8;

/**
 * "Aufsteiger der Woche": who beats their own usual week (average of their active weeks
 * in the last 8, at least `minWeeks` of them) by the biggest percentage this week.
 * Rewards effort instead of volume, so anyone can win it. Names in `skip` are never picked.
 */
export function weekRiser(
  entries: ChallengeEntry[],
  now = new Date(),
  skip: readonly string[] = [],
  minWeeks = 2,
): WeekRiser | null {
  const thisWk = weekStart(now);
  const oldest = thisWk - RISER_LOOKBACK_WEEKS * 7;
  const skipped = new Set(skip.map(normName));
  const byName = new Map<string, ChallengeEntry[]>();
  for (const e of entries) {
    if (skipped.has(normName(e.name))) continue;
    const list = byName.get(e.name) ?? [];
    list.push(e);
    byName.set(e.name, list);
  }

  let best: WeekRiser | null = null;
  for (const [name, mine] of byName) {
    const weeks = weeklyTotals(mine);
    const value = weeks.get(thisWk) ?? 0;
    const past = [...weeks].filter(([wk, total]) => wk < thisWk && wk >= oldest && total > 0).map(([, t]) => t);
    if (past.length < minWeeks || value <= 0) continue;
    const usual = past.reduce((s, t) => s + t, 0) / past.length;
    const percent = Math.round((value / usual - 1) * 100);
    if (percent > 0 && (!best || percent > best.percent)) best = { name, value, percent };
  }
  return best;
}

export interface RouteStop {
  name: string;
  emoji?: string;
  cumulativeKm: number;
}

/**
 * The furthest route stop reached when the shared total went from `before` to `after`.
 * The start (0 km) is skipped; reaching `lapKm` means the route is finished. Null if none.
 */
export function crossedStop(before: number, after: number, stops: RouteStop[], lapKm: number): Arrival | null {
  if (after <= before) return null;
  if (before < lapKm && after >= lapKm) return { name: stops[0]?.name ?? 'Ziel', emoji: '🏆', finish: true };
  const last = stops.filter((s) => s.cumulativeKm > 0 && before < s.cumulativeKm && after >= s.cumulativeKm).at(-1);
  return last ? { name: last.name, emoji: last.emoji ?? '📍', finish: false } : null;
}

/** The next stop ahead of `total` and how far away it is (the end of the lap leads back to the start). */
export function nextStop(total: number, stops: RouteStop[], lapKm: number): NextStop | null {
  if (total >= lapKm || !stops.length) return null;
  const next = stops.find((s) => s.cumulativeKm > total);
  return next
    ? { name: next.name, remaining: Math.round(next.cumulativeKm - total) }
    : { name: stops[0].name, remaining: Math.round(lapKm - total) };
}

/** Badges for one person's entries. Distance badges only apply to km challenges. */
export function badgesFor(mine: ChallengeEntry[], unit: string): Badge[] {
  const runs = mine.length;
  const longest = Math.max(0, ...mine.map((e) => e.value));
  const tuesdays = new Set(
    mine
      .map((e) => new Date(e.date))
      .filter((d) => !isNaN(d.getTime()) && d.getDay() === 2)
      .map((d) => d.toDateString()),
  ).size;
  const streak = longestStreak(weeklyTotals(mine).keys());

  const badges: Badge[] = [
    { emoji: '🌱', label: 'Erster Schritt', hint: 'Ersten Eintrag loggen', earned: runs >= 1 },
    { emoji: '🔟', label: 'Zehner', hint: '10 Einträge', earned: runs >= 10 },
    { emoji: '💯', label: 'Dauerbrenner', hint: '50 Einträge', earned: runs >= 50 },
    { emoji: '🌊', label: 'Waidsee-Stammgast', hint: 'An 5 Dienstagen geloggt', earned: tuesdays >= 5 },
    { emoji: '🔥', label: 'Am Ball', hint: '4 Wochen in Folge', earned: streak >= 4 },
  ];
  if (unit === 'km') {
    badges.push(
      { emoji: '🏃', label: 'Halbmarathon', hint: 'Ein Lauf ab 21 km', earned: longest >= 21 },
      { emoji: '🦄', label: 'Marathon', hint: 'Ein Lauf ab 42 km', earned: longest >= 42 },
    );
  }
  return badges;
}

/** Who is one place ahead of `name`, and how much is needed to pass them. Null for first place / unknown. */
export function nextTarget(rankings: ChallengeRanking[], name: string): NextTarget | null {
  const index = rankings.findIndex((r) => r.name === name);
  if (index <= 0) return null;
  const ahead = rankings[index - 1];
  return { name: ahead.name, place: index, needed: ahead.value - rankings[index].value + 1 };
}

/**
 * Personal bests hit by the entry that turned `before` into `after`: longest single
 * entry, best week (only when the week newly passes the previous best) and the
 * highest personal-total milestone crossed. The very first entry never counts as a record.
 */
export function detectRecords(
  before: ChallengeEntry[],
  after: ChallengeEntry[],
  name: string,
  milestones: number[],
): RecordHit[] {
  const mineBefore = before.filter((e) => e.name === name);
  const mineAfter = after.filter((e) => e.name === name);
  if (mineAfter.length <= mineBefore.length) return [];

  const hits: RecordHit[] = [];

  if (mineBefore.length) {
    const prevLongest = Math.max(...mineBefore.map((e) => e.value));
    const newLongest = Math.max(...mineAfter.map((e) => e.value));
    if (newLongest > prevLongest) hits.push({ kind: 'longest', value: newLongest });

    const weeksBefore = weeklyTotals(mineBefore);
    for (const [week, total] of weeklyTotals(mineAfter)) {
      const prevTotal = weeksBefore.get(week) ?? 0;
      if (total <= prevTotal) continue;
      const prevBest = Math.max(0, ...[...weeksBefore].filter(([w]) => w !== week).map(([, t]) => t));
      // Announce only the entry that pushes the week past the old best, not every later one.
      if (prevBest > 0 && prevTotal <= prevBest && total > prevBest) {
        hits.push({ kind: 'bestWeek', value: total });
        continue;
      }
      // Smaller win that most people can reach: passing the week before.
      const lastWeek = weeksBefore.get(week - 7) ?? 0;
      if (lastWeek > 0 && prevTotal <= lastWeek && total > lastWeek)
        hits.push({ kind: 'beatLastWeek', value: lastWeek });
    }
  }

  const sum = (list: ChallengeEntry[]) => list.reduce((s, e) => s + e.value, 0);
  const totalBefore = sum(mineBefore);
  const totalAfter = sum(mineAfter);
  const crossed = milestones.filter((m) => totalBefore < m && totalAfter >= m);
  if (crossed.length) hits.push({ kind: 'milestone', value: Math.max(...crossed) });

  return hits;
}

/**
 * Compares two rankings for one person. Returns a RankUp if they passed at least
 * one other person, otherwise null.
 */
export function detectRankUp(before: ChallengeRanking[], after: ChallengeRanking[], name: string): RankUp | null {
  const oldIndex = before.findIndex((r) => r.name === name);
  const newIndex = after.findIndex((r) => r.name === name);
  if (newIndex === -1) return null;

  const wasAhead = new Set((oldIndex === -1 ? before : before.slice(0, oldIndex)).map((r) => r.name));
  const overtaken = after
    .slice(newIndex + 1)
    .filter((r) => wasAhead.has(r.name))
    .map((r) => r.name);
  if (overtaken.length === 0) return null;

  return { name, from: oldIndex === -1 ? null : oldIndex + 1, to: newIndex + 1, overtaken };
}

/** Newest entries first (does not mutate the input). */
export function newestFirst(entries: ChallengeEntry[]): ChallengeEntry[] {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Progress towards a goal as a whole percent, capped at 100. */
export function progressPercent(total: number, goal: number): number {
  return Math.min(Math.round((total / goal) * 100), 100);
}
