import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';
import { StatsTable } from '../../components/stats-table/stats-table';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { ProgressChart } from '../../components/progress-chart/progress-chart';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import { LockScreen } from '../../components/app-lock-screen/app-lock-screen';
import { LockService } from '../../services/lock-service';
import { ToastService } from '../../services/toast-service';
import { ChallengeForm } from '../../components/challenge-form/challenge-form';
import { RankUpCelebration, RankUpState } from '../../components/rank-up-celebration/rank-up-celebration';
import { ChallengeEntry } from '../../interfaces/challenge.interface';
import { newestFirst, progressPercent } from '../../utils/challenge-utils';

@Component({
  selector: 'app-challenge',
  imports: [StatsTable, RankingTable, ProgressChart, GoalBanner, LockScreen, ChallengeForm, RankUpCelebration],
  templateUrl: './challenge.html',
  styleUrls: ['./challenge.scss'],
})
export class Challenge {
  readonly challengeService = inject(ChallengeService);
  readonly lockService = inject(LockService);
  private readonly toast = inject(ToastService);

  readonly entries = toSignal(this.challengeService.entries$.pipe(map(newestFirst)), { initialValue: [] });
  readonly rankings = toSignal(this.challengeService.rankings$, { initialValue: [] });
  readonly total = toSignal(this.challengeService.total$, { initialValue: 0 });
  readonly progressPercentage = computed(() => progressPercent(this.total(), this.challengeService.config.goalValue));
  readonly rankUp = new RankUpState();

  constructor() {
    this.challengeService.loadData();
  }

  onValueChange({ name, value }: { name: string; value: number }) {
    if (value > this.challengeService.config.maxEntryValue) {
      this.toast.show('Sei ehrlich 🤥😏😳');
    } else if (value > 350) {
      this.toast.show('Boaah 😨');
    } else if (value > 100) {
      this.toast.show(`Stark ${name.split(' ')[0]} 💪`);
    }
  }

  async onSubmit({ name, value }: { name: string; value: number }) {
    try {
      this.rankUp.reset();
      this.rankUp.show(await this.challengeService.submitData(name, value));
    } catch (error) {
      console.error('Error submitting data:', error);
    }
  }

  async onDelete(entry: ChallengeEntry) {
    try {
      await this.challengeService.deleteData(entry);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }
}
