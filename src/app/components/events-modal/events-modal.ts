import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppEvent } from '../../models/app-event';
import { EventsService } from '../../services/events-service';
import { formatEventDate } from '../../utils/event-utils';

@Component({
  selector: 'app-events-modal',
  templateUrl: './events-modal.html',
  imports: [FormsModule],
  styleUrls: ['./events-modal.scss'],
})
export class EventsModalComponent {
  private readonly eventsService = inject(EventsService);

  readonly event = input<AppEvent | null>(null);
  readonly show = input(false);
  readonly close = output<void>();

  readonly showAddParticipantForm = signal(false);
  newParticipantName = '';

  readonly formatDate = formatEventDate;

  async addParticipant() {
    const event = this.event();
    if (!event || !this.newParticipantName) return;

    this.close.emit();
    await this.eventsService.addParticipant(event.name, this.newParticipantName);
    this.showAddParticipantForm.set(false);
    this.newParticipantName = '';
  }
}
