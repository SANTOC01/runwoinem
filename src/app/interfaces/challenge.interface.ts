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
  goals: ChallengeGoal[];
  chartProfile: ChartProfilePoint[];
  chartMaxScale: number;
}
