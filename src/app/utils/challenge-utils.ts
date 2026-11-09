import { ChallengeEntry, ChallengeRanking, RankUp } from '../interfaces/challenge.interface';

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
