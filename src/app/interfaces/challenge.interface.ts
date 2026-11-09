export interface ChallengeEntry {
  name: string;
  value: number;
  date: string;
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
  kind: 'longest' | 'bestWeek' | 'milestone';
  value: number;
}

/** Everything worth reacting to after someone logs an entry. */
export interface SubmitResult {
  rankUp: RankUp | null;
  records: RecordHit[];
  nextTarget: NextTarget | null;
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
