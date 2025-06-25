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

    try {
      const success = await this.challengeService.addParticipant(
        this.event.name, 
        this.newParticipantName
      );
      if (success) {
        this.showAddParticipantForm = false;
        this.newParticipantName = '';
        this.closeModal();
      }
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  }
}
