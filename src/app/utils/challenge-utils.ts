import { ChallengeEntry } from '../interfaces/challenge.interface';

/** Newest entries first (does not mutate the input). */
export function newestFirst(entries: ChallengeEntry[]): ChallengeEntry[] {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Progress towards a goal as a whole percent, capped at 100. */
export function progressPercent(total: number, goal: number): number {
  return Math.min(Math.round((total / goal) * 100), 100);
}
