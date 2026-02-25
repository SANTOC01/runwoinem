import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChallengeService } from '../../services/challenge-service';
import { Subscription } from 'rxjs';
import { AppEvent } from '../../models/app-event';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss']
})
export class Events implements OnInit, OnDestroy {
  events: AppEvent[] = [];

  private subscription: Subscription | null = null;

  @Output() openEventModal = new EventEmitter<AppEvent>();

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    this.subscription = this.challengeService.events$.subscribe(events => {
      this.events = events;
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  openEventModalHandler(event: AppEvent) {
    this.openEventModal.emit(event);
  }

  formatDate(dateString: string): string {
    let year: number, month: number, day: number;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString.trim())) {
      [day, month, year] = dateString.trim().split('.').map(Number);
    } else {
      [year, month, day] = dateString.substring(0, 10).split('-').map(Number);
    }
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getParticipantCount(event: AppEvent): number {
    return event.participants?.length ?? 0;
  }
}
