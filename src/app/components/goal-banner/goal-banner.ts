import { Component, computed, input } from '@angular/core';
import { ChallengeGoal } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-goal-banner',
  templateUrl: './goal-banner.html',
  styleUrls: ['./goal-banner.scss'],
})
export class GoalBanner {
  readonly total = input(0);
  readonly goals = input<ChallengeGoal[]>([]);
  readonly unit = input('');

  /** Banner text, or null while there are no goals to show. */
  readonly message = computed(() => {
    const goals = this.goals();
    if (!goals.length) return null;

    const total = this.total();
    const reached = goals.filter((g) => total >= g.target).at(-1);
    return reached ? `🎉 Ziel erreicht: ${reached.emoji} ${reached.reward}!` : 'Noch kein Ziel erreicht 😮';
  });
}
