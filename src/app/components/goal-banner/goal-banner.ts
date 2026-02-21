import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChallengeGoal } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-goal-banner',
  standalone: true,
  imports: [],
  templateUrl: './goal-banner.html',
  styleUrls: ['./goal-banner.scss']
})
export class GoalBanner implements OnChanges {
  @Input() total = 0;
  @Input() goals: ChallengeGoal[] = [];
  @Input() unit = '';

  message = '';
  isVisible = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['total'] || changes['goals']) {
      this.updateBanner(this.total);
    }
  }

  private updateBanner(total: number) {
    if (!this.goals.length) return;

    let lastReachedGoal: ChallengeGoal | undefined;
    for (const goal of this.goals) {
      if (total >= goal.target) {
        lastReachedGoal = goal;
      }
    }

    this.message = lastReachedGoal
      ? `🎉 Ziel erreicht: ${lastReachedGoal.emoji} ${lastReachedGoal.reward}!`
      : 'Noch kein Ziel erreicht 😮';

    this.isVisible = true;
  }
}
