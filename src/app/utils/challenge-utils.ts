import { ChallengeEntry, ChallengeRanking, NextTarget, RankUp, RecordHit } from '../interfaces/challenge.interface';

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
      if (prevBest > 0 && prevTotal <= prevBest && total > prevBest) hits.push({ kind: 'bestWeek', value: total });
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
