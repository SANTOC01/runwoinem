import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Events } from '../../components/events/events';
import { ChallengeService } from '../../services/challenge-service';
import { KmChallengeService } from '../../services/km-challenge-service';
import { EuropeMap } from '../../components/europe-map/europe-map';
import { Subscription } from 'rxjs';
import { EventsModalComponent } from "../../components/events-modal/events-modal";
import { AppEvent } from '../../models/app-event';
import { ToastService } from '../../services/toast-service';
import { Loading } from '../../components/app-loading/app-loading';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Events,
    EventsModalComponent,
    Loading,
    EuropeMap
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {
  showWidget = false;
  buttonEnabled = false;
  eurotripBgImage = '';
  private subscription: Subscription | null = null;
  mapOpen = false;
  selectedEvent: AppEvent | null = null;

  readonly nextRun = Dashboard.computeNextRun(new Date());

  constructor(
    public challengeService: ChallengeService,
    public kmChallengeService: KmChallengeService,
    private toast: ToastService
  ) {}

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

  @HostListener('document:keydown.escape')
  onEscape() {
    this.mapOpen = false;
  }

  ngOnInit() {
    // Initial load
    this.loadDashboardData();

    // Background refresh after 5 seconds — skip if data was just freshly loaded
    setTimeout(() => {
      if (!this.challengeService.isFreshlyLoaded()) {
        this.forceRefreshData();
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private async loadDashboardData() {
    this.subscription = new Subscription();

    this.subscription.add(
      this.challengeService.rankings$.subscribe(rankings => {
        if (rankings && rankings.length > 0) {
          this.showWidget = true;
        }
      })
    );

    this.subscription.add(
      this.kmChallengeService.rankings$.subscribe(rankings => {
        if (rankings && rankings.length > 0) {
          this.showWidget = true;
        }
      })
    );

    await Promise.all([
      this.challengeService.loadEvents(),
      this.challengeService.loadData(),
      this.kmChallengeService.loadData()
    ]);
  }

  private async forceRefreshData() {
    await Promise.all([
      this.challengeService.refreshEvents(),
      this.challengeService.refreshAllData(),
      this.kmChallengeService.refreshAllData()
    ]);
    this.toast.show('🟢 Live');
  }

  toggleMap() {
    this.mapOpen = !this.mapOpen;
  }

  openEventModal(event: AppEvent) {
    this.selectedEvent = event;
  }

  closeEventModal() {
    this.selectedEvent = null;
  }

}
