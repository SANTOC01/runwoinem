import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ChallengeEntry } from '../../interfaces/challenge.interface';

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

/** Monday 00:00 (local) of the week containing the date, as a day number. */
function weekStart(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Mon = 0
  return Math.round((d.getTime() - offset * DAY_MS) / DAY_MS);
}

@Component({
  selector: 'app-personal-stats',
  standalone: true,
  templateUrl: './personal-stats.html',
  styleUrl: './personal-stats.scss'
})
export class PersonalStats implements OnChanges {
  @Input() name = '';
  @Input() entries: ChallengeEntry[] = [];
  @Input() unit = '';
  @Output() closed = new EventEmitter<void>();

  stats: PersonalStatsData | null = null;

  ngOnChanges(): void {
    this.stats = this.compute();
  }

  private compute(): PersonalStatsData | null {
    const mine = this.entries.filter(e => e.name === this.name);
    if (!mine.length) return null;

    const total = mine.reduce((s, e) => s + e.value, 0);
    const longest = Math.max(...mine.map(e => e.value));

    const perWeek = new Map<number, number>();
    for (const e of mine) {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) continue;
      const wk = weekStart(d);
      perWeek.set(wk, (perWeek.get(wk) ?? 0) + e.value);
    }

    let bestWeek = 0;
    let bestKm = 0;
    perWeek.forEach((km, wk) => {
      if (km > bestKm) { bestKm = km; bestWeek = wk; }
    });

    // Streak: consecutive weeks with at least one run. The current week
    // may still be empty without breaking the streak.
    const thisWeek = weekStart(new Date());
    let cursor = perWeek.has(thisWeek) ? thisWeek : thisWeek - 7;
    let streak = 0;
    while (perWeek.has(cursor)) { streak++; cursor -= 7; }

    const totals = new Map<string, number>();
    for (const e of this.entries) totals.set(e.name, (totals.get(e.name) ?? 0) + e.value);
    const rank = [...totals.values()].filter(v => v > total).length + 1;

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
