import { Component, ElementRef, Injector, afterNextRender, effect, inject, input, output } from '@angular/core';
import { Tip } from '../../directives/tip';
import { ChallengeRanking, RankUp } from '../../interfaces/challenge.interface';

const RANK_EMOJIS = ['🏆', '🥈', '🥉'];
const MIN_STREAK = 2;

@Component({
  selector: 'app-ranking-table',
  imports: [Tip],
  templateUrl: './ranking-table.html',
  styleUrls: ['./ranking-table.scss'],
})
export class RankingTable {
  readonly rankings = input<ChallengeRanking[]>([]);
  readonly unit = input('');
  /** When true, names are rendered as links that emit `nameSelected`. */
  readonly clickable = input(false);
  readonly nameSelected = output<string>();
  /** Animates this person's row climbing into its new place. */
  readonly rankUp = input<RankUp | null>(null);
  /** Weekly run streak per name; a flame is shown from `MIN_STREAK` weeks on. */
  readonly streaks = input<ReadonlyMap<string, number>>(new Map());
  /** Name of the "Läufer der Woche" (most logged this week); gets a star. */
  readonly weekLeader = input<string | null>(null);
  /** Name of the "Aufsteiger der Woche" (biggest jump over their own usual week). */
  readonly weekRiser = input<string | null>(null);

  /** The streak to show for a name, or 0 when too short to brag about. */
  streakOf(name: string): number {
    const weeks = this.streaks().get(name) ?? 0;
    return weeks >= MIN_STREAK ? weeks : 0;
  }

  /** Rows the highlighted row climbs past (newcomers slide in from below the list). */
  climbRows(index: number): number {
    const up = this.rankUp();
    if (!up) return 0;
    return (up.from ?? this.rankings().length) - 1 - index;
  }

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const injector = inject(Injector);
    effect(() => {
      if (!this.rankUp()) return;
      // Bring the climbing row on screen (the table is below the fold on phones).
      afterNextRender(
        () => host.nativeElement.querySelector('tr.rank-up')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        { injector },
      );
    });
  }

  getRankEmoji(index: number): string {
    return RANK_EMOJIS[index] ?? '🏅';
  }

  getRankText(index: number, name: string): string {
    if (index === 0 && name.toLowerCase() === 'max') {
      return 'Max';
    }
    return (index + 1).toString();
  }
}
