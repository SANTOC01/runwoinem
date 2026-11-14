import {
  Arrival,
  Badge,
  ChallengeEntry,
  ChallengeRanking,
  NextStop,
  NextTarget,
  RankUp,
  RecordHit,
} from '../interfaces/challenge.interface';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An entry's value as whole units, rounded half up (9.5 -> 10, 9.4 -> 9). Accepts numbers
 * and sheet strings, including a decimal comma ("9,5"). Unreadable values count as 0.
 */
export function roundValue(raw: unknown): number {
  const value =
    typeof raw === 'number'
      ? raw
      : Number(
          String(raw ?? '')
            .trim()
            .replace(',', '.'),
        );
  return Number.isFinite(value) ? Math.round(value) : 0;
}

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
 * This week's sum for everyone together. (Läufer/Aufsteiger der Woche are computed by
 * the backend, see `WeekSummary`.)
 */
export function weekTotal(entries: ChallengeEntry[], now = new Date()): number {
  const week = weekStart(now);
  return entries.reduce((sum, e) => {
    const d = new Date(e.date);
    return !isNaN(d.getTime()) && weekStart(d) === week ? sum + e.value : sum;
  }, 0);
}

/** Local calendar day as a day number (midnight-based, safe across DST changes). */
function dayNumber(d: Date): number {
  return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS);
}

export interface TrendPoint {
  /** The last day of the 7-day window. */
  date: Date;
  /** Sum of the 7 days ending on `date`. */
  value: number;
}

/**
 * Rolling 7-day totals for everyone together, one point per day for the last `days`
 * days (ending today). Rolling windows avoid the dip every Monday that calendar weeks have.
 */
export function rollingWeekTrend(entries: ChallengeEntry[], now = new Date(), days = 56): TrendPoint[] {
  const today = dayNumber(now);
  const first = today - days + 1;
  const perDay = new Map<number, number>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime())) continue;
    const day = dayNumber(d);
    if (day < first - 6 || day > today) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + e.value);
  }
  return Array.from({ length: days }, (_, i) => {
    const end = first + i;
    let value = 0;
    for (let day = end - 6; day <= end; day++) value += perDay.get(day) ?? 0;
    return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i)), value };
  });
}

/** Last 7 days compared with the 7 days before, from a rolling trend (null if too short). */
export function trendChange(trend: TrendPoint[]): { last7: number; previous7: number; delta: number } | null {
  if (trend.length < 8) return null;
  const last7 = trend[trend.length - 1].value;
  const previous7 = trend[trend.length - 8].value;
  return { last7, previous7, delta: last7 - previous7 };
}

const WEEKDAY = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

/** Choices for "when did you run?": today, yesterday and the 5 days before (value '' = today). */
export function runDayOptions(now = new Date(), days = 7): { value: string; label: string }[] {
  return Array.from({ length: days }, (_, ago) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
    const value = ago === 0 ? '' : localDayKey(d);
    const label = ago === 0 ? 'Heute' : ago === 1 ? 'Gestern' : WEEKDAY.format(d);
    return { value, label };
  });
}

/** YYYY-MM-DD of a date in local time. */
export function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

/**
 * Race-distance badges only count a single entry within [min, max] km: a bit of tolerance
 * for GPS and the way home, but a 60 or 100 km entry is a month logged at once, not a race.
 */
export const DISTANCE_BADGES = {
  half: { min: 21, max: 23 },
  marathon: { min: 42, max: 44 },
} as const;

/** Badges for one person's entries. Distance badges only apply to km challenges. */
export function badgesFor(mine: ChallengeEntry[], unit: string): Badge[] {
  const runs = mine.length;
  const ranRange = ({ min, max }: { min: number; max: number }) => mine.some((e) => e.value >= min && e.value <= max);
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
      {
        emoji: '🏃',
        label: 'Halbmarathon',
        hint: `Ein Lauf von ${DISTANCE_BADGES.half.min}–${DISTANCE_BADGES.half.max} km`,
        earned: ranRange(DISTANCE_BADGES.half) || ranRange(DISTANCE_BADGES.marathon), // a marathon includes a half
      },
      {
        emoji: '🦄',
        label: 'Marathon',
        hint: `Ein Lauf von ${DISTANCE_BADGES.marathon.min}–${DISTANCE_BADGES.marathon.max} km`,
        earned: ranRange(DISTANCE_BADGES.marathon),
      },
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
