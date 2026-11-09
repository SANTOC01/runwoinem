import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Events } from '../../components/events/events';
import { ChallengeService } from '../../services/challenge-service';
import { KmChallengeService } from '../../services/km-challenge-service';
import { EventsService } from '../../services/events-service';
import { EuropeMap } from '../../components/europe-map/europe-map';
import { EventsModalComponent } from '../../components/events-modal/events-modal';
import { AppEvent } from '../../models/app-event';
import { ToastService } from '../../services/toast-service';
import { Loading } from '../../components/app-loading/app-loading';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterModule, Events, EventsModalComponent, Loading, EuropeMap],
  host: { '(document:keydown.escape)': 'mapOpen.set(false)' },
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
  private readonly challengeService = inject(ChallengeService);
  private readonly kmChallengeService = inject(KmChallengeService);
  private readonly eventsService = inject(EventsService);
  private readonly toast = inject(ToastService);

  readonly nextRun = Dashboard.computeNextRun(new Date());
  readonly mapOpen = signal(false);
  readonly selectedEvent = signal<AppEvent | null>(null);
  readonly eurotripBgImage = signal('');

  readonly kmTotal = toSignal(this.kmChallengeService.total$, { initialValue: 0 });
  private readonly hmRankings = toSignal(this.challengeService.rankings$, { initialValue: [] });
  private readonly kmRankings = toSignal(this.kmChallengeService.rankings$, { initialValue: [] });
  /** The widgets appear as soon as either challenge has data. */
  readonly showWidget = computed(() => this.hmRankings().length > 0 || this.kmRankings().length > 0);

  constructor() {
    Promise.all([
      this.eventsService.loadEvents(),
      this.challengeService.loadData(),
      this.kmChallengeService.loadData()
    ]);

    // Background refresh after 5 seconds — skip if data was just freshly loaded
    const timer = setTimeout(() => {
      if (!this.challengeService.isFreshlyLoaded()) this.forceRefreshData();
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /** Next Tuesday run (18:00–19:00), relative to `now`. */
  static computeNextRun(now: Date): { relative: string; dateLabel: string; soon: boolean } {
    const RUN_DAY = 2, START = 18, END = 19;
    const run = new Date(now.getFullYear(), now.getMonth(), now.getDate(), START);
    let days = (RUN_DAY - now.getDay() + 7) % 7;
    if (days === 0 && now.getHours() >= END) days = 7;
    run.setDate(run.getDate() + days);

    const dateLabel = run.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    if (days === 0) {
      const running = now.getHours() >= START;
      return { relative: running ? 'läuft gerade' : 'heute', dateLabel, soon: true };
    }
    if (days === 1) return { relative: 'morgen', dateLabel, soon: true };
    return { relative: `in ${days} Tagen`, dateLabel, soon: false };
  }

  private async forceRefreshData() {
    await Promise.all([
      this.eventsService.refreshEvents(),
      this.challengeService.refreshAllData(),
      this.kmChallengeService.refreshAllData()
    ]);
    this.toast.show('🟢 Live');
  }

  toggleMap() {
    this.mapOpen.update(open => !open);
  }
}
