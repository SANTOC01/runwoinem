import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
import confetti from 'canvas-confetti';

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
  @ViewChild('confettiCanvas', { static: false }) confettiCanvas!: ElementRef<HTMLCanvasElement>;
  private confettiInterval: any = null;
  private confettiFired = false;

  constructor(
    private challengeService: ChallengeService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initial load
    this.loadDashboardData();

    // Background refresh after 5 seconds
    setTimeout(() => {
      this.forceRefreshData();
    }, 5000);

    // Subscribe to totalHM to trigger confetti
    this.challengeService.totalHM$.subscribe(total => {
      if (total >= 100000 && !this.confettiFired && total < 101000) {
        this.launchConfetti();
        this.confettiFired = true;
      }
      if (total < 100000) {
        this.confettiFired = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private async loadDashboardData() {
    // Show widget when rankings data is available
    this.subscription = this.challengeService.rankings$.subscribe(rankings => {
      if (rankings.length > 0) {
        this.showWidget = true;
        this.cdr.detectChanges();
      }
    });

    await this.challengeService.loadData();
    this.cdr.detectChanges();
  }

  private async forceRefreshData() {
    await this.challengeService.refreshAllData();
    this.cdr.detectChanges();
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

  launchConfetti() {
    if (!this.confettiCanvas) return;
        const myConfetti = confetti.create(this.confettiCanvas.nativeElement, { resize: true, useWorker: true });
        this.confettiInterval = setInterval(() => {
          myConfetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 1600); // every 1.2 seconds
      }

  }
