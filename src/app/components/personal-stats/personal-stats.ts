import { Component, computed, input, output } from '@angular/core';
import { ChallengeEntry } from '../../interfaces/challenge.interface';
import { streakFromWeeks, weeklyTotals } from '../../utils/challenge-utils';

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
    const longest = Math.max(...mine.map((e) => e.value));

    const perWeek = weeklyTotals(mine);

    let bestWeek = 0;
    let bestKm = 0;
    perWeek.forEach((km, wk) => {
      if (km > bestKm) {
        bestKm = km;
        bestWeek = wk;
      }
    });

    const streak = streakFromWeeks(perWeek);

    const totals = new Map<string, number>();
    for (const e of entries) totals.set(e.name, (totals.get(e.name) ?? 0) + e.value);
    const rank = [...totals.values()].filter((v) => v > total).length + 1;

    return {
      total,
      runs: mine.length,
      longest,
      average: Math.round((total / mine.length) * 10) / 10,
      bestWeekKm: bestKm,
      bestWeekLabel: bestKm
        ? 'KW ab ' + new Date(bestWeek * DAY_MS).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        : '',
      streak,
      rank,
      runners: totals.size,
    };
  }
}
