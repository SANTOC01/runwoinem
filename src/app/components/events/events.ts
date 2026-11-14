import { Component, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { EventsService } from '../../services/events-service';
import { AppEvent } from '../../models/app-event';
import { distText, formatEventDate } from '../../utils/event-utils';

@Component({
  selector: 'app-events',
  imports: [RouterModule],
  host: { '(document:click)': 'closeLegendOutside($event)' },
  templateUrl: './events.html',
  styleUrls: ['./events.scss'],
})
export class Events {
  readonly events = toSignal(inject(EventsService).events$, { initialValue: [] });
  readonly openEventModal = output<AppEvent>();

  /** The distance legend: opens on tap (touch has no hover) and on hover with a mouse. */
  readonly legendOpen = signal(false);

  closeLegendOutside(event: Event) {
    if (!(event.target as Element).closest('.info-container')) this.legendOpen.set(false);
  }

  readonly formatDate = formatEventDate;
  readonly getDistText = distText;

  getParticipantCount(event: AppEvent): number {
    return event.participants?.length ?? 0;
  }
}
