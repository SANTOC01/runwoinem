import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import { Events } from '../../components/events/events';
import { ChallengeService } from '../../services/challenge-service';
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
    RankingTable,
    GoalBanner,
    Events,
    EventsModalComponent,
    Loading
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {
  showWidget = false;
  buttonEnabled = false;
  private subscription: Subscription | null = null;
  mapOpen = false;
  selectedEvent: AppEvent | null = null;

  constructor(
    public challengeService: ChallengeService,
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
    this.subscription = this.challengeService.rankings$.subscribe(rankings => {
      if (rankings && rankings.length > 0) {
        this.showWidget = true;
      }
    });

    await this.challengeService.loadData();
  }

  private async forceRefreshData() {
    await this.challengeService.refreshAllData();
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
