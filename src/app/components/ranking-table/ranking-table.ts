import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';

@Component({
  selector: 'app-ranking-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking-table.html',
  styleUrls: ['./ranking-table.scss']
})
export class RankingTable implements OnInit, OnDestroy {
  rankings: { name: string, hohenmeter: number }[] = [];
  isLoading = true;
  private subscription: Subscription | null = null;

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    this.subscription = combineLatest([
      this.challengeService.rankings$
    ]).subscribe({
      next: ([rankings]) => {

        this.rankings = rankings;
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getRankEmoji(index: number): string {
    switch(index) {
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
