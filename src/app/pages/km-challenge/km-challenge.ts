import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { KmChallengeService } from '../../services/km-challenge-service';
import { StatsTable } from '../../components/stats-table/stats-table';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { EuropeMap } from '../../components/europe-map/europe-map';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import { LockScreen } from '../../components/app-lock-screen/app-lock-screen';
import { LockService } from '../../services/lock-service';
import { ToastService } from '../../services/toast-service';
import { ChallengeForm } from '../../components/challenge-form/challenge-form';
import { PersonalStats } from '../../components/personal-stats/personal-stats';
import { RankUpCelebration, RankUpState } from '../../components/rank-up-celebration/rank-up-celebration';
import { ChallengeEntry } from '../../interfaces/challenge.interface';
import { newestFirst, progressPercent } from '../../utils/challenge-utils';

const BOOST_SEEN_KEY = 'km_boost_intro_seen';

@Component({
  selector: 'app-km-challenge',
  imports: [
    StatsTable,
    RankingTable,
    EuropeMap,
    GoalBanner,
    LockScreen,
    ChallengeForm,
    PersonalStats,
    RankUpCelebration,
  ],
  templateUrl: './km-challenge.html',
  styleUrls: ['./km-challenge.scss'],
})
export class KmChallenge {
  readonly kmChallengeService = inject(KmChallengeService);
  readonly lockService = inject(LockService);
  private readonly toast = inject(ToastService);

  readonly entries = toSignal(this.kmChallengeService.entries$.pipe(map(newestFirst)), { initialValue: [] });
  readonly rankings = toSignal(this.kmChallengeService.rankings$, { initialValue: [] });
  readonly total = toSignal(this.kmChallengeService.total$, { initialValue: 0 });
  readonly progressPercentage = computed(() => progressPercent(this.total(), this.kmChallengeService.config.goalValue));

  readonly cityBgPath = signal('');
  readonly selectedName = signal('');
  readonly showBoostIntro = this.kmChallengeService.showBoostIntro();
  readonly boostInfoOpen = signal(false);
  readonly rankUp = new RankUpState();

  readonly boostFootnote = '⚡ Dienstag-Boost: zählt doppelt für den Eurotrip, nicht für die persönlichen km.';
  readonly isBoosted = (e: ChallengeEntry) => this.kmChallengeService.isBoosted(e);

  constructor() {
    this.kmChallengeService.loadData();
    if (this.showBoostIntro && !this.boostSeenToday()) {
      this.boostInfoOpen.set(true); // auto-open once per boost day
      this.markBoostSeen();
    }
  }

  private boostSeenToday(): boolean {
    try {
      return localStorage.getItem(BOOST_SEEN_KEY) === new Date().toDateString();
    } catch {
      return false;
    }
  }

  private markBoostSeen() {
    try {
      localStorage.setItem(BOOST_SEEN_KEY, new Date().toDateString());
    } catch {
      /* ignore */
    }
  }

  onValueChange({ name, value }: { name: string; value: number }) {
    if (value > this.kmChallengeService.config.maxEntryValue) {
      this.toast.show('Sei ehrlich 🤥😏😳');
    } else if (value > 30) {
      this.toast.show('Boaah 😨');
    } else if (value > 10) {
      this.toast.show(`Stark ${name.split(' ')[0]} 💪`);
    }
  }

  async onSubmit({ name, value }: { name: string; value: number }) {
    try {
      this.rankUp.reset();
      this.rankUp.show(await this.kmChallengeService.submitData(name, value));
      if (this.kmChallengeService.isBoostDay()) {
        this.toast.show('⚡ Dienstag-Boost: zählt doppelt für den Eurotrip!');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
    }
  }

  async onDelete(entry: ChallengeEntry) {
    try {
      await this.kmChallengeService.deleteData(entry);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }
}
