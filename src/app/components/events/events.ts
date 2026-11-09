import { Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { EventsService } from '../../services/events-service';
import { AppEvent } from '../../models/app-event';
import { distText, formatEventDate } from '../../utils/event-utils';

@Component({
  selector: 'app-events',
  imports: [RouterModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss']
})
export class Events {
  readonly events = toSignal(inject(EventsService).events$, { initialValue: [] });
  readonly openEventModal = output<AppEvent>();

  readonly formatDate = formatEventDate;
  readonly getDistText = distText;

  getParticipantCount(event: AppEvent): number {
    return event.participants?.length ?? 0;
  }
}
