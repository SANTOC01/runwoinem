import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeRanking } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-ranking-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking-table.html',
  styleUrls: ['./ranking-table.scss']
})
export class RankingTable {
  @Input() rankings: ChallengeRanking[] = [];
  @Input() unit = '';

  getRankEmoji(index: number): string {
    switch (index) {
      case 0: return '🏆';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  }

  getRankText(index: number, name: string): string {
    if (index === 0 && name.toLowerCase() === 'max') {
      return 'Max';
    }
    return (index + 1).toString();
  }
}
