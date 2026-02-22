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

  constructor(
    public challengeService: ChallengeService,
    public kmChallengeService: KmChallengeService,
    private toast: ToastService
  ) {}

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
