import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RankingTable } from '../../components/ranking-table/ranking-table';
import { GoalBanner } from '../../components/goal-banner/goal-banner';
import { Events } from '../../components/events/events';
import { ChallengeService } from '../../services/challenge-service';
import { Subscription } from 'rxjs';
import { EventsModalComponent } from "../../components/events-modal/events-modal";
import { AppEvent } from '../../models/app-event'; // <-- Add this import

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RankingTable,
    GoalBanner,
    Events,
    EventsModalComponent
],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {
  showWidget = false;
  buttonEnabled = false;
  private subscription: Subscription | null = null;
  mapOpen = false;
  selectedEvent: AppEvent | null = null; // <-- Use AppEvent

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    // Show widget when rankings data is available
    this.subscription = this.challengeService.rankings$.subscribe(rankings => {
      if (rankings.length > 0) {
        this.showWidget = true;
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleMap() {
    this.mapOpen = !this.mapOpen;
  }

  openEventModal(event: AppEvent) { // <-- Use AppEvent
    this.selectedEvent = event;
  }

  closeEventModal() {
    this.selectedEvent = null;
  }
}