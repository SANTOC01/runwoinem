import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router} from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';
import { StatsTable } from '../../components/stats-table/stats-table';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { ProgressChart } from '../../components/progress-chart/progress-chart';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import {LockScreen} from '../../components/app-lock-screen/app-lock-screen'
import { LockService } from '../../services/lock-service';


@Component({
  selector: 'app-challenge',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsTable,
    RankingTable,
    ProgressChart,
    GoalBanner,
    LockScreen

  ],
  templateUrl: './challenge.html',
  styleUrls: ['./challenge.scss']
})
export class Challenge implements OnInit, OnDestroy {
  name = '';
  hohenmeter: number | null = null;
  totalHM = 0;
  progressPercentage = 0;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly challengeService: ChallengeService,
    public lockService: LockService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit() {

      this.challengeService.totalHM$.subscribe(total => {
        this.totalHM = total;
        this.progressPercentage = Math.min(Math.round((total / 100000) * 100), 100);
      })
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  validateHohenmeter() {
    if (this.hohenmeter != null && this.hohenmeter > 1200) {
      this.showToast("Sei ehrlich 🤥😏😳");
    } else if (this.hohenmeter != null &&this.hohenmeter > 350) {
      this.showToast("Boaah 😨");
    } else if (this.hohenmeter != null &&this.hohenmeter > 100) {
      this.showToast(`Stark ${this.name.split(' ')[0]} 💪`);
    }

  }

  async submitData() {
    if (!this.name || !this.hohenmeter) {
      this.showToast('Bitte Name und Höhenmeter eingeben! 🙏');
      return;
    }

    try {
      await this.challengeService.submitData(this.name, this.hohenmeter);
      this.showToast('Daten erfolgreich gespeichert! 🎉');
      this.hohenmeter = 0; // Reset input after successful submission
    } catch (error) {
      console.error('Error submitting data:', error);
      this.showToast('Fehler beim Speichern der Daten 😢');
    }
  }

  private showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Add animation class after a brief delay
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
      }, 300); // Wait for hide animation to complete
    }, 3000);
  }
}
