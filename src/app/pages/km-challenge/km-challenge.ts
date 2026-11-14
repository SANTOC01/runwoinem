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
import { ChallengeForm, FormSubmission } from '../../components/challenge-form/challenge-form';
import { PersonalStats } from '../../components/personal-stats/personal-stats';
import { RankUpCelebration } from '../../components/rank-up-celebration/rank-up-celebration';
import { SubmitFeedback } from '../../components/rank-up-celebration/submit-feedback';
import { SubmitProgress } from '../../components/submit-progress/submit-progress';
import { ChallengeEntry } from '../../interfaces/challenge.interface';
import { Tip } from '../../directives/tip';
import { WeekTrend } from '../../components/week-trend/week-trend';
import {
  newestFirst,
  progressPercent,
  rollingWeekTrend,
  streaksByName,
  trendChange,
  weekTotal,
} from '../../utils/challenge-utils';

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
    SubmitProgress,
    WeekTrend,
    Tip,
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
  readonly feedback = new SubmitFeedback();
  readonly streaks = computed(() => streaksByName(this.entries()));
  /** This week's group km (always up to date locally) and the "Läufer der Woche" (from the backend). */
  readonly week = computed(() => ({
    total: weekTotal(this.entries()),
    leader: this.kmChallengeService.week()?.leader ?? null,
  }));
  /** "Aufsteiger der Woche": biggest jump over one's own usual week (from the backend). */
  readonly riser = computed(() => this.kmChallengeService.week()?.riser ?? null);
  /** Group km of the last 7 days, day by day over 8 weeks (the sparkline). */
  readonly trend = computed(() => rollingWeekTrend(this.entries()));
  /** Last 7 days vs. the 7 days before (null until there is any history). */
  readonly change = computed(() => {
    const c = trendChange(this.trend());
    return c && (c.last7 > 0 || c.previous7 > 0) ? c : null;
  });
  /** Compact form shown in the pill, e.g. "▲ +31 km". */
  readonly changeLabel = computed(() => {
    const delta = this.change()?.delta ?? 0;
    const unit = this.kmChallengeService.config.metricUnit;
    if (delta > 0) return `▲ +${delta} ${unit}`;
    if (delta < 0) return `▼ −${-delta} ${unit}`;
    return `■ ±0 ${unit}`;
  });
  /** The sparkline stays hidden until the change is clicked. */
  readonly trendOpen = signal(false);
  readonly boostDay = this.kmChallengeService.isBoostDay();
  /** Extra km the boost added to the shared total today. */
  readonly boostBonus = computed(() => this.kmChallengeService.boostBonusToday(this.entries()));

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

  async onSubmit({ name, value, date, collection }: FormSubmission) {
    try {
      this.feedback.reset();
      const result = await this.kmChallengeService.submitData(name, value, date, collection);
      const runDay = date ? new Date(`${date}T12:00:00`) : new Date();
      const boostNotice =
        result && this.kmChallengeService.isBoostDay(runDay)
          ? '⚡ Dienstag-Boost: zählt doppelt für den Eurotrip!'
          : undefined;
      this.feedback.show(result, this.kmChallengeService.config.metricUnit, boostNotice);
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
