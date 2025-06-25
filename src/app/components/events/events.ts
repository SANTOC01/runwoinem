import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChallengeService } from '../../services/challenge-service';
import { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AppEvent } from '../../models/app-event'; // <-- Add this import

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss']
})
export class Events implements OnInit, OnDestroy {
  events: AppEvent[] = [];
  selectedEvent: AppEvent | null = null;
  showAddParticipantForm = false;
  newParticipantName = '';
  private subscription: Subscription | null = null;

  @Output() openEventModal = new EventEmitter<AppEvent>();

  // In your service and everywhere else
  private eventsSubject = new BehaviorSubject<AppEvent[]>([]);
  readonly events$ = this.eventsSubject.asObservable().pipe(shareReplay(1));

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    this.subscription = this.challengeService.events$.subscribe(events => {
      this.events = events.map((event: any) => ({
        name: event.name,
        dist: event.dist,
        date: event.date,
        daysLeft: event.daysLeft,
        participants: event.participants
      }));
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

  closeModal() {
    this.selectedEvent = null;
    this.showAddParticipantForm = false;
  }

  

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
