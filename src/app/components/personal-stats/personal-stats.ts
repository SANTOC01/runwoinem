import { Component, computed, input, output } from '@angular/core';
import { Badge, ChallengeEntry } from '../../interfaces/challenge.interface';
import {
  badgesFor,
  longestRun,
  singleRuns,
  streakFromWeeks,
  validWeeklyTotals,
  weeklyTotals,
} from '../../utils/challenge-utils';

interface PersonalStatsData {
  total: number;
  runs: number;
  longest: number;
  average: number;
  bestWeekKm: number;
  bestWeekLabel: string;
  streak: number;
  rank: number;
  runners: number;
  badges: Badge[];
  earnedBadges: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-personal-stats',
  templateUrl: './personal-stats.html',
  styleUrl: './personal-stats.scss',
})
export class PersonalStats {
  readonly name = input('');
  readonly entries = input<ChallengeEntry[]>([]);
  readonly unit = input('');
  readonly closed = output<void>();

  readonly stats = computed(() => this.compute());

  private compute(): PersonalStatsData | null {
    const name = this.name();
    const entries = this.entries();
    const mine = entries.filter((e) => e.name === name);
    if (!mine.length) return null;

    const total = mine.reduce((s, e) => s + e.value, 0);
    // Collections (several runs logged at once) count for the total, not for run analytics.
    const longest = longestRun(mine);
    const runs = singleRuns(mine);
    const average = runs.length ? Math.round((runs.reduce((s, e) => s + e.value, 0) / runs.length) * 10) / 10 : 0;

    const perWeek = weeklyTotals(mine);

    // Best week: weeks with a collection don't count.
    let bestWeek = 0;
    let bestKm = 0;
    validWeeklyTotals(mine).forEach((km, wk) => {
      if (km > bestKm) {
        bestKm = km;
        bestWeek = wk;
      }
    });

    const streak = streakFromWeeks(perWeek);

    const totals = new Map<string, number>();
    for (const e of entries) totals.set(e.name, (totals.get(e.name) ?? 0) + e.value);
    const rank = [...totals.values()].filter((v) => v > total).length + 1;
    const badges = badgesFor(mine, this.unit());

    return {
      total,
      runs: mine.length,
      longest,
      average,
      bestWeekKm: bestKm,
      bestWeekLabel: bestKm
        ? 'KW ab ' + new Date(bestWeek * DAY_MS).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        : '',
      streak,
      rank,
      runners: totals.size,
      badges,
      earnedBadges: badges.filter((b) => b.earned).length,
    };
  }
}
