import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
import { ChallengeEntry, ChallengeRanking } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-km-challenge',
  standalone: true,
  imports: [
    CommonModule,
    StatsTable,
    RankingTable,
    EuropeMap,
    GoalBanner,
    LockScreen,
    ChallengeForm,
    PersonalStats
  ],
  templateUrl: './km-challenge.html',
  styleUrls: ['./km-challenge.scss']
})
export class KmChallenge implements OnInit, OnDestroy {
  entries: ChallengeEntry[] = [];
  rankings: ChallengeRanking[] = [];
  total = 0;
  progressPercentage = 0;
  cityBgPath = '';
  showBoostIntro = false;
  boostInfoOpen = false;
  selectedName = '';
  readonly boostFootnote =
    '⚡ Dienstag-Boost: zählt doppelt für den Eurotrip, nicht für die persönlichen km.';
  readonly isBoosted = (e: ChallengeEntry) => this.kmChallengeService.isBoosted(e);
  private readonly subscriptions: Subscription[] = [];

  constructor(
    public readonly kmChallengeService: KmChallengeService,
    public readonly lockService: LockService,
    private readonly toast: ToastService
  ) {}

  ngOnInit() {
    this.kmChallengeService.loadData();
    this.showBoostIntro = this.kmChallengeService.showBoostIntro();
    if (this.showBoostIntro && !this.boostSeenToday()) {
      this.boostInfoOpen = true; // auto-open once per boost day
      this.markBoostSeen();
    }
    this.subscriptions.push(
      this.kmChallengeService.entries$.subscribe(entries => {
        this.entries = [...entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      }),
      this.kmChallengeService.rankings$.subscribe(rankings => {
        this.rankings = rankings;
      }),
      this.kmChallengeService.total$.subscribe(total => {
        this.total = total;
        this.progressPercentage = Math.min(
          Math.round((total / this.kmChallengeService.config.goalValue) * 100),
          100
        );
      })
    );
  }

  private readonly BOOST_SEEN_KEY = 'km_boost_intro_seen';

  private boostSeenToday(): boolean {
    try {
      return localStorage.getItem(this.BOOST_SEEN_KEY) === new Date().toDateString();
    } catch { return false; }
  }

  private markBoostSeen() {
    try { localStorage.setItem(this.BOOST_SEEN_KEY, new Date().toDateString()); } catch { /* ignore */ }
  }

  openBoostInfo() { this.boostInfoOpen = true; }
  closeBoostInfo() { this.boostInfoOpen = false; }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onValueChange(event: { name: string; value: number }) {
    const { name, value } = event;
    if (value > this.kmChallengeService.config.maxEntryValue) {
      this.toast.show('Sei ehrlich 🤥😏😳');
    } else if (value > 30) {
      this.toast.show('Boaah 😨');
    } else if (value > 10) {
      this.toast.show(`Stark ${name.split(' ')[0]} 💪`);
    }
  }

  async onSubmit(event: { name: string; value: number }) {
    try {
      await this.kmChallengeService.submitData(event.name, event.value);
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
