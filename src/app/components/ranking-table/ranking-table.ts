import { Component, ElementRef, Injector, afterNextRender, effect, inject, input, output } from '@angular/core';
import { ChallengeRanking, RankUp } from '../../interfaces/challenge.interface';

const RANK_EMOJIS = ['🏆', '🥈', '🥉'];

@Component({
  selector: 'app-ranking-table',
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
