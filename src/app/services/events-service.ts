import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppEvent } from '../models/app-event';
import { SheetApi } from './sheet-api.service';
import { ToastService } from './toast-service';
import { readCache, startOfToday, writeCache } from './local-cache';

const EVENTS_CACHE_KEY = 'events_data';
const PAST_YEARS_CACHE_KEY = 'events_past_years';
const PAST_EVENTS_CACHE_PREFIX = 'events_past_';

/** Upcoming/past events and participants. Caches are valid until midnight. */
@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly api = inject(SheetApi);
  private readonly toast = inject(ToastService);

  private readonly eventsSubject = new BehaviorSubject<AppEvent[]>([]);
  readonly events$ = this.eventsSubject.asObservable();
  private eventsLoaded = false;

  async loadEvents(): Promise<void> {
    if (this.eventsLoaded) return;
    const cached = readCache<AppEvent[]>(EVENTS_CACHE_KEY, ts => ts >= startOfToday());
    if (cached) {
      this.eventsSubject.next(cached.data);
      this.eventsLoaded = true;
      return;
    }
    await this.refreshEvents();
  }

  async refreshEvents(): Promise<void> {
    try {
      const response = await this.api.get<{ events?: AppEvent[] }>('getEvents');
      const events = response?.events ?? [];
      this.eventsSubject.next(events);
      writeCache(EVENTS_CACHE_KEY, events);
      this.eventsLoaded = true;
    } catch (error) {
      console.error('Error refreshing events:', error);
      this.toast.show('Fehler beim Laden der Events!', 4000);
    }
  }

  async loadPastYears(): Promise<Record<string, number>> {
    const cached = readCache<Record<string, number>>(PAST_YEARS_CACHE_KEY, ts => ts >= startOfToday());
    if (cached) return cached.data;
    try {
      const response = await this.api.get<{ years?: Record<string, number> }>('getPastEvents');
      const years = response?.years ?? {};
      writeCache(PAST_YEARS_CACHE_KEY, years);
      return years;
    } catch (error) {
      console.error('Error loading past years:', error);
      return {};
    }
  }

  async loadPastEvents(year: number): Promise<AppEvent[]> {
    const key = `${PAST_EVENTS_CACHE_PREFIX}${year}`;
    const cached = readCache<AppEvent[]>(key, ts => ts >= startOfToday());
    if (cached) return cached.data;
    try {
      const response = await this.api.get<{ events?: AppEvent[] }>('getPastEvents', { year });
      const events = response?.events ?? [];
      writeCache(key, events);
      return events;
    } catch (error) {
      console.error('Error loading past events:', error);
      this.toast.show('Fehler beim Laden vergangener Events!', 4000);
      return [];
    }
  }

  async addParticipant(eventName: string, participantName: string): Promise<boolean> {
    try {
      const response = await this.api.post<{ status?: string }>({ action: 'addParticipant', eventName, participantName });
      if (response?.status === 'participant_added') {
        const events = [...this.eventsSubject.value];
        const event = events.find(e => e.name === eventName);
        if (event) {
          (event.participants ??= []).push(participantName);
          this.eventsSubject.next(events);
          writeCache(EVENTS_CACHE_KEY, events);
        }
        this.toast.show('Teilnehmer hinzugefügt!');
        return true;
      }
      this.toast.show('Teilnehmer konnte nicht hinzugefügt werden.', 4000);
      return false;
    } catch (error) {
      console.error('Error adding participant:', error);
      this.toast.show('Fehler beim Hinzufügen des Teilnehmers!', 4000);
      return false;
    }
  }
}
