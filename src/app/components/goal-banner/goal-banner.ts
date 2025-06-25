import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';
import { Loading } from '../../components/app-loading/app-loading';

interface Goal {
  target: number;
  emoji: string;
  reward: string;
}

@Component({
  selector: 'app-goal-banner',
  standalone: true,
  imports: [CommonModule, Loading],
  template: `
    <app-loading [isLoading]="isLoading"></app-loading>
    <div class="banner" *ngIf="isVisible && !isLoading">
      {{ message }}
    </div>
  `,
  styleUrls: ['./goal-banner.scss']
})
export class GoalBanner implements OnInit, OnDestroy {
  private subscription: Subscription | null = null;
  message: string = '';
  isVisible: boolean = false;
  isLoading = true;

  private goals: Goal[] = [
    { target: 10000, emoji: '🎭', reward: 'Trainer im Kostüm' },
    { target: 25000, emoji: '🍕', reward: 'Pizza nach dem Lauf' },
    { target: 50000, emoji: '🥤', reward: 'Geheimsnack & Getränke' },
    { target: 75000, emoji: '🍰', reward: 'Erdbeertorte & Urkunden' },
    { target: 100000, emoji: '💃', reward: 'Schabernack!' }
  ];

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    this.subscription = this.challengeService.totalHM$
      .subscribe(total => {
        this.updateBanner(total);
        this.isLoading = false;
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateBanner(total: number) {
    let lastReachedGoal: Goal | undefined;

    for (const goal of this.goals) {
      if (total >= goal.target) {
        lastReachedGoal = goal;
      }
    }

    if (lastReachedGoal) {
      this.message = `🎉 Ziel erreicht: ${lastReachedGoal.emoji} ${lastReachedGoal.reward}!`;
    } else {
      this.message = "Noch kein Ziel erreicht 😮";
    }

    this.isVisible = true;
  }
}
