import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { LockService } from './lock-service';
import { AppEvent } from '../models/app-event';
import { ToastService } from './toast-service';
import { ChartData } from '../models/chart-data';
import { ChallengeConfig, ChallengeEntry, ChallengeRanking } from '../interfaces/challenge.interface';
import { BaseChallengeService } from './base-challenge.service';
import { environment } from '../../environments/environment';

interface EntriesCacheData {
  entries: ChallengeEntry[];
  timestamp: number;
}

interface EventsCacheData {
  events: AppEvent[];
  timestamp: number;
}

interface GetAllResponse {
  main: unknown[][];
}

interface GetEventsResponse {
  events: AppEvent[];
}

interface ParticipantResponse {
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChallengeService extends BaseChallengeService {
  private readonly SHEET_URL = environment.gipfelstuermerSheetUrl;
  private readonly ENTRIES_CACHE_KEY = 'gipfelstuermer_entries';
  private readonly EVENTS_CACHE_KEY = 'events_data';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  readonly config: ChallengeConfig = {
    id: 'gipfelstuermer-2025',
    title: 'Gipfelstürmer Event 2025',
    active: false,
    metricLabel: 'Höhenmeter',
    metricUnit: 'HM',
    goalValue: 100000,
    maxEntryValue: 1200,
    goals: [
      { target: 10000,  emoji: '🎭', reward: 'Trainer im Kostüm' },
      { target: 25000,  emoji: '🍕', reward: 'Pizza nach dem Lauf' },
      { target: 50000,  emoji: '🥤', reward: 'Geheimsnack & Getränke' },
      { target: 75000,  emoji: '🍰', reward: 'Erdbeertorte & Urkunden' },
      { target: 100000, emoji: '💃', reward: 'Schabernack!' }
    ],
    chartProfile: [
      { x: 0,      y: 0 },
      { x: 10000,  y: 10000 },
      { x: 12500,  y: 8000 },
      { x: 25000,  y: 25000 },
      { x: 29000,  y: 20000 },
      { x: 50000,  y: 50000 },
      { x: 55000,  y: 45000 },
      { x: 75000,  y: 75000 },
      { x: 82000,  y: 69000 },
      { x: 100000, y: 100000 },
      { x: 103000, y: 93000 },
      { x: 110000, y: 70000 }
    ],
    chartMaxScale: 110000
  };

  private eventsSubject = new BehaviorSubject<AppEvent[]>([]);
  readonly events$ = this.eventsSubject.asObservable();

  private entriesSubject   = new BehaviorSubject<ChallengeEntry[]>([]);
  private rankingsSubject  = new BehaviorSubject<ChallengeRanking[]>([]);
  private totalSubject     = new BehaviorSubject<number>(0);
  private chartDataSubject = new BehaviorSubject<ChartData>({ labels: [], values: [] });
  private dataLoaded = false;
  private fetchedAt: number | null = null;

  readonly entries$   = this.entriesSubject.asObservable();
  readonly rankings$  = this.rankingsSubject.asObservable();
  readonly total$     = this.totalSubject.asObservable();
  readonly chartData$ = this.chartDataSubject.asObservable();

  private eventsLoaded = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
    private lockService: LockService,
    private toast: ToastService
  ) {
    super();
  }

  // ─── Entries (HM1 challenge) ──────────────────────────────────────────────

  private loadEntriesFromCache(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const cached = localStorage.getItem(this.ENTRIES_CACHE_KEY);
      if (cached) {
        const { entries, timestamp } = JSON.parse(cached) as EntriesCacheData;
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.updateState(entries);
          this.dataLoaded = true;
          this.fetchedAt = timestamp;
          return true;
        }
        localStorage.removeItem(this.ENTRIES_CACHE_KEY);
      }
    } catch (error) {
      console.error('Error reading entries cache:', error);
    }
    return false;
  }

  private saveEntriesToCache(entries: ChallengeEntry[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const cache: EntriesCacheData = { entries, timestamp: Date.now() };
      localStorage.setItem(this.ENTRIES_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving entries cache:', error);
    }
  }

  public async refreshAllData(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllResponse>(`${this.SHEET_URL}?action=getAll&challenge=HM1`)
      );
      const entries = this.processEntries(response?.main ?? []);
      this.updateState(entries);
      this.saveEntriesToCache(entries);
      this.dataLoaded = true;
      this.fetchedAt = Date.now();
    } catch (error) {
      console.error('Error refreshing HM1 data:', error);
      this.toast.show('Fehler beim Laden der Daten!', 4000);
    }
  }

  async loadData(): Promise<void> {
    if (this.dataLoaded) return;
    if (this.loadEntriesFromCache()) return;
    await this.refreshAllData();
  }

  /** Returns true if data was fetched or loaded from cache within the last `withinMs` ms. */
  isFreshlyLoaded(withinMs = 30_000): boolean {
    return this.fetchedAt !== null && (Date.now() - this.fetchedAt) < withinMs;
  }

  // ─── Events (shared, not tied to a challenge) ────────────────────────────

  private loadEventsFromCache(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const cached = localStorage.getItem(this.EVENTS_CACHE_KEY);
      if (cached) {
        const { events, timestamp } = JSON.parse(cached) as EventsCacheData;
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.eventsSubject.next(events);
          this.eventsLoaded = true;
          return true;
        }
        localStorage.removeItem(this.EVENTS_CACHE_KEY);
      }
    } catch (error) {
      console.error('Error reading events cache:', error);
    }
    return false;
  }

  private saveEventsToCache(events: AppEvent[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const cache: EventsCacheData = { events, timestamp: Date.now() };
      localStorage.setItem(this.EVENTS_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving events cache:', error);
    }
  }

  async loadEvents(): Promise<void> {
    if (this.eventsLoaded) return;
    if (this.loadEventsFromCache()) return;
    await this.refreshEvents();
  }

  async refreshEvents(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetEventsResponse>(`${this.SHEET_URL}?action=getEvents`)
      );
      const events = response?.events ?? [];
      this.eventsSubject.next(events);
      this.saveEventsToCache(events);
      this.eventsLoaded = true;
    } catch (error) {
      console.error('Error refreshing events:', error);
      this.toast.show('Fehler beim Laden der Events!', 4000);
    }
  }

  async submitData(name: string, value: number): Promise<void> {
    if (!this.config.active) {
      this.toast.show('Die Challenge ist beendet. Keine Einträge mehr möglich. 🔒');
      return;
    }

    name = name.trim();

    const isUnlocked = await this.lockService.requestUnlock();
    if (!isUnlocked) return;

    const newEntry: ChallengeEntry = { name, value, date: new Date().toISOString() };

    try {
      this.updateLocalState(newEntry, 'add');
      await firstValueFrom(
        this.http.get(`${this.SHEET_URL}?action=add&name=${encodeURIComponent(name)}&hohenmeter=${value}&challenge=HM1`)
      );
      this.toast.show('Eintrag erfolgreich hinzugefügt!');
    } catch (error) {
      console.error('Error submitting data:', error);
      await this.refreshAllData();
      this.toast.show('Fehler beim Hinzufügen des Eintrags!', 4000);
      throw error;
    }
  }

  async deleteData(entry: ChallengeEntry): Promise<void> {
    const isUnlocked = await this.lockService.requestUnlock();
    if (!isUnlocked) return;

    try {
      this.updateLocalState(entry, 'delete');
      await firstValueFrom(
        this.http.get(`${this.SHEET_URL}?action=delete&name=${encodeURIComponent(entry.name)}&hohenmeter=${entry.value}&challenge=HM1`)
      );
      this.toast.show('Eintrag gelöscht.');
    } catch (error) {
      console.error('Error deleting data:', error);
      await this.refreshAllData();
      this.toast.show('Fehler beim Löschen des Eintrags!', 4000);
      throw error;
    }
  }

  async loadPastYears(): Promise<Record<string, number>> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ years: Record<string, number> }>(`${this.SHEET_URL}?action=getPastEvents`)
      );
      return response?.years ?? {};
    } catch (error) {
      console.error('Error loading past years:', error);
      return {};
    }
  }

  async loadPastEvents(year: number): Promise<AppEvent[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ events: AppEvent[] }>(`${this.SHEET_URL}?action=getPastEvents&year=${year}`)
      );
      return response?.events ?? [];
    } catch (error) {
      console.error('Error loading past events:', error);
      this.toast.show('Fehler beim Laden vergangener Events!', 4000);
      return [];
    }
  }

  async addParticipant(eventName: string, participantName: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<ParticipantResponse>(
          `${this.SHEET_URL}?action=addParticipant&eventName=${encodeURIComponent(eventName)}&participantName=${encodeURIComponent(participantName)}`
        )
      );

      if (response?.status === 'participant_added') {
        const events = [...this.eventsSubject.value];
        const event = events.find(e => e.name === eventName);
        if (event) {
          if (!event.participants) event.participants = [];
          event.participants.push(participantName);
          this.eventsSubject.next(events);
          this.saveEventsToCache(events);
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

  private updateLocalState(entry: ChallengeEntry, action: 'add' | 'delete'): void {
    const currentEntries = [...this.entriesSubject.value];
    let changed = false;

    if (action === 'add') {
      currentEntries.unshift(entry);
      changed = true;
    } else {
      const index = currentEntries.findIndex(e =>
        e.name === entry.name && e.value === entry.value
      );
      if (index !== -1) {
        currentEntries.splice(index, 1);
        changed = true;
      }
    }

    if (changed) {
      this.updateState(currentEntries);
      this.saveEntriesToCache(currentEntries);
    }
  }

  private updateState(entries: ChallengeEntry[]): void {
    this.entriesSubject.next(entries);
    this.rankingsSubject.next(this.calculateRankings(entries));
    this.totalSubject.next(this.calculateTotal(entries));
    this.chartDataSubject.next(this.calculateChartData(entries));
    this.dataLoaded = true;
  }

  private processEntries(data: unknown[][]): ChallengeEntry[] {
    return data.map(row => {
      const r = row as [string, string, string];
      return { name: r[0], value: parseInt(r[1]), date: r[2] };
    });
  }

  private calculateTotal(entries: ChallengeEntry[]): number {
    return entries.reduce((sum, e) => sum + e.value, 0);
  }

  private calculateRankings(entries: ChallengeEntry[]): ChallengeRanking[] {
    const userTotals = entries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.name] = (acc[entry.name] ?? 0) + entry.value;
      return acc;
    }, {});

    return Object.entries(userTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private calculateChartData(entries: ChallengeEntry[]): ChartData {
    const sortedEntries = [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-100);

    return {
      labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString()),
      values: sortedEntries.map(e => e.value)
    };
  }

  isDataLoaded(): boolean {
    return this.dataLoaded;
  }
}
