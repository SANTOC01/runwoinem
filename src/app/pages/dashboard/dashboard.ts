import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Events } from '../../components/events/events';
import { KmChallengeService } from '../../services/km-challenge-service';
import { EventsService } from '../../services/events-service';
import { EuropeMap } from '../../components/europe-map/europe-map';
import { EventsModalComponent } from '../../components/events-modal/events-modal';
import { AppEvent } from '../../models/app-event';
import { ToastService } from '../../services/toast-service';
import { Loading } from '../../components/app-loading/app-loading';
import { WHATSAPP_GROUP_URL } from '../../links';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterModule, Events, EventsModalComponent, Loading, EuropeMap],
  host: { '(document:keydown.escape)': 'mapOpen.set(false)' },
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  private readonly kmChallengeService = inject(KmChallengeService);
  private readonly eventsService = inject(EventsService);
  private readonly toast = inject(ToastService);

  readonly nextRun = Dashboard.computeNextRun(new Date());
  readonly whatsappUrl = WHATSAPP_GROUP_URL;
  readonly mapOpen = signal(false);
  readonly selectedEvent = signal<AppEvent | null>(null);
  readonly eurotripBgImage = signal('');

  readonly kmTotal = toSignal(this.kmChallengeService.total$, { initialValue: 0 });
  private readonly kmRankings = toSignal(this.kmChallengeService.rankings$, { initialValue: [] });
  private readonly kmLoaded = signal(false);
  /** The widgets appear once the Eurotrip data is there (or loading it has finished, even if it failed). */
  readonly showWidget = computed(() => this.kmLoaded() || this.kmRankings().length > 0);

  constructor() {
    this.eventsService.loadEvents();
    this.kmChallengeService.loadData().finally(() => this.kmLoaded.set(true));

    // loadData already revalidates the challenge; after 5 s also refresh the events (cached till
    // midnight). Challenge data fetched moments ago is not fetched again.
    const timer = setTimeout(() => {
      this.refreshInBackground();
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /** Next Tuesday run (18:00–19:00), relative to `now`. */
  static computeNextRun(now: Date): { relative: string; dateLabel: string; soon: boolean } {
    const RUN_DAY = 2,
      START = 18,
      END = 19;
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

  private async refreshInBackground() {
    const results = await Promise.all([this.eventsService.refreshEvents(), this.kmChallengeService.revalidate()]);
    // Only claim "live" if nothing failed; otherwise the error toast stays visible.
    if (results.every(Boolean)) this.toast.show('🟢 Live');
  }
}
