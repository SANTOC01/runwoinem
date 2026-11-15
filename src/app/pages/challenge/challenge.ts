import { Component, inject } from '@angular/core';
import { ChallengeService } from '../../services/challenge-service';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { ProgressChart } from '../../components/progress-chart/progress-chart';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import { progressPercent } from '../../utils/challenge-utils';

/** The finished Gipfelstürmer challenge: final ranking and progress, read-only. */
@Component({
  selector: 'app-challenge',
  imports: [RankingTable, ProgressChart, GoalBanner],
  templateUrl: './challenge.html',
  styleUrls: ['./challenge.scss'],
})
export class Challenge {
  readonly challengeService = inject(ChallengeService);
  readonly config = this.challengeService.config;
  readonly rankings = this.challengeService.rankings;
  readonly total = this.challengeService.total;
  readonly progressPercentage = progressPercent(this.total, this.config.goalValue);
}
