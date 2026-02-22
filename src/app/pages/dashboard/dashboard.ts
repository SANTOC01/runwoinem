import { Component, OnInit, OnDestroy } from '@angular/core';
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

  private readonly KM_OPEN_DATE = new Date('2026-03-01T00:00:00');
  isKmChallengeOpen = false;
  countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    public challengeService: ChallengeService,
    public kmChallengeService: KmChallengeService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.updateCountdown();
    if (!this.isKmChallengeOpen) {
      this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

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
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private updateCountdown() {
    const diff = this.KM_OPEN_DATE.getTime() - Date.now();
    if (diff <= 0) {
      this.isKmChallengeOpen = true;
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      return;
    }
    this.countdown.days    = Math.floor(diff / 86400000);
    this.countdown.hours   = Math.floor((diff % 86400000) / 3600000);
    this.countdown.minutes = Math.floor((diff % 3600000) / 60000);
    this.countdown.seconds = Math.floor((diff % 60000) / 1000);
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
      this.challengeService.loadData(),
      this.kmChallengeService.loadData()
    ]);
  }

  private async forceRefreshData() {
    await Promise.all([
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
