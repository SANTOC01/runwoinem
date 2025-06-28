import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppEvent } from '../../models/app-event';
import { ChallengeService } from '../../services/challenge-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-events-modal',
  templateUrl: './events-modal.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./events-modal.scss'],
})
export class EventsModalComponent {
  @Input() event: AppEvent | null = null; // <-- Use AppEvent
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  events: AppEvent[] = [];
  selectedEvent: AppEvent | null = null;
  showAddParticipantForm = false;
  newParticipantName = '';

  constructor(public challengeService: ChallengeService) {}


  closeModal() {
    this.close.emit();
  }

  async addParticipant() {
    if (!this.event || !this.newParticipantName) return;

    this.closeModal();

    try {
      await this.challengeService.addParticipant(
        this.event.name,
        this.newParticipantName
      );
      this.showAddParticipantForm = false;
      this.newParticipantName = '';
    } catch (error) {
      console.error('Error adding participant:', error);
    }
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
