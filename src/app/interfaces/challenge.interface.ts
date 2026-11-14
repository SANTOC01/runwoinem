export interface ChallengeEntry {
  name: string;
  value: number;
  /** The run's day (ISO). */
  date: string;
  /** Row id from the backend (missing for entries not yet saved, or from older backends). */
  id?: string;
}

/** This week's spotlight, computed by the backend. */
export interface WeekSummary {
  total: number;
  leader: WeekLeader | null;
  riser: WeekRiser | null;
}

export interface ChallengeRanking {
  name: string;
  value: number;
}

/** Someone climbed the ranking. Places are 1-based; `from` is null for a newcomer. */
export interface RankUp {
  name: string;
  from: number | null;
  to: number;
  overtaken: string[];
}

/** Who is next up the ranking and how much is needed to pass them. */
export interface NextTarget {
  name: string;
  place: number;
  needed: number;
}

/** A personal best hit by a new entry. `value` is the new best (or the milestone reached). */
export interface RecordHit {
  /** `beatLastWeek`: this week passed last week; `value` is last week's total. */
  kind: 'longest' | 'bestWeek' | 'milestone' | 'beatLastWeek';
  value: number;
}

/** The shared total reached a new stop on the route (e.g. a Eurotrip city). */
export interface Arrival {
  name: string;
  emoji: string;
  /** True when the whole route was completed. */
  finish: boolean;
}

/** Most logged this week (Mon–Sun). */
export interface WeekLeader {
  name: string;
  value: number;
}

/** Biggest jump this week over one's own usual week (in percent). */
export interface WeekRiser {
  name: string;
  value: number;
  percent: number;
}

/** The next stop on the shared route and how far away it is. */
export interface NextStop {
  name: string;
  remaining: number;
}

/** How an entry moved the group along the route. */
export interface RouteProgress extends NextStop {
  /** What the entry added to the shared total (doubled on boost days). */
  added: number;
}

/** A badge in the personal stats; `earned` ones are shown in colour, the rest greyed with `hint`. */
export interface Badge {
  emoji: string;
  label: string;
  hint: string;
  earned: boolean;
}

/** Where saving a new entry is at. */
export type SaveState = 'idle' | 'saving' | 'done' | 'error';

/** Everything worth reacting to after someone logs an entry. */
export interface SubmitResult {
  /** Who logged the entry. */
  name: string;
  rankUp: RankUp | null;
  records: RecordHit[];
  nextTarget: NextTarget | null;
  arrival: Arrival | null;
  /** Null when the challenge has no route. */
  route: RouteProgress | null;
}

export interface ChallengeGoal {
  target: number;
  emoji: string;
  reward: string;
}

export interface ChartProfilePoint {
  x: number;
  y: number;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  active: boolean;
  metricLabel: string;
  metricUnit: string;
  goalValue: number;
  maxEntryValue: number;
  /** Personal total thresholds that get celebrated when crossed. */
  milestones: number[];
  goals: ChallengeGoal[];
  chartProfile: ChartProfilePoint[];
  chartMaxScale: number;
}
