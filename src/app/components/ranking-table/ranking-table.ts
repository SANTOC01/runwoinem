import { Component, input, output } from '@angular/core';
import { ChallengeRanking } from '../../interfaces/challenge.interface';

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
