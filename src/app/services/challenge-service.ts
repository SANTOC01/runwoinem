import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, shareReplay } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { LockService } from './lock-service';
import { AppEvent } from '../models/app-event';
import { ToastService } from './toast-service';

interface DataRow {
  name: string;
  hohenmeter: number;
  date: string;
}

interface ChartData {
  labels: string[];
  values: number[];
}

interface CacheData {
  entries: DataRow[];
  events: AppEvent[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {
  private readonly SHEET_URL = "https://script.google.com/macros/s/AKfycbyEsiUImD-pqWYWYQlyDov7s7g1q-iKTHXKk8qqE8lyhdPX_nJsQPGeWrF1wpDtDd6c/exec";
  private readonly CACHE_KEY = 'gipfelstuermer_data';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private eventsSubject = new BehaviorSubject<AppEvent[]>([]);
  readonly events$ = this.eventsSubject.asObservable().pipe(shareReplay(1));

  private entriesSubject = new BehaviorSubject<DataRow[]>([]);
  private rankingsSubject = new BehaviorSubject<{ name: string, hohenmeter: number }[]>([]);
  private totalHMSubject = new BehaviorSubject<number>(0);
  private chartDataSubject = new BehaviorSubject<ChartData>({ labels: [], values: [] });
  private dataLoaded = false;

  readonly entries$ = this.entriesSubject.asObservable().pipe(shareReplay(1));
  readonly rankings$ = this.rankingsSubject.asObservable().pipe(shareReplay(1));
  readonly totalHM$ = this.totalHMSubject.asObservable().pipe(shareReplay(1));
  readonly chartData$ = this.chartDataSubject.asObservable().pipe(shareReplay(1));

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private lockService: LockService,
    private toast: ToastService
  ) {
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
    // Try to load from cache first
    const cacheLoaded = this.loadFromCache();
    if (!cacheLoaded) {
      await this.refreshAllData();
    }
  }

  private loadFromCache(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const { entries, events, timestamp } = JSON.parse(cached) as CacheData;
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.updateState(entries);
          this.eventsSubject.next(events);
          this.dataLoaded = true;
          return true;
        }
        localStorage.removeItem(this.CACHE_KEY);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return false;
  }

  private saveToCache(entries: DataRow[], events: AppEvent[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const cache: CacheData = {
        entries,
        events,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private async refreshAllData(): Promise<void> {
    try {
      const response = await this.fetchAllData();
      if (response) {
        const entries = this.processEntries(response.main);
        const events = response.events;
        this.updateState(entries);
        this.eventsSubject.next(events);
        this.saveToCache(entries, events);
        this.dataLoaded = true;
      }
    } catch (error) {
      console.error('Error refreshing all data:', error);
      this.toast.show('Fehler beim Laden der Daten!', 4000);
    }
  }

  async loadData(): Promise<void> {
    if (this.dataLoaded) return;
    await this.refreshAllData();
  }

  async submitData(name: string, hohenmeter: number): Promise<void> {
    const isUnlocked = await this.lockService.requestUnlock();
    if (!isUnlocked) return;

    const newEntry: DataRow = { name, hohenmeter, date: new Date().toISOString() };

    try {
      this.updateLocalState(newEntry, 'add');
      await firstValueFrom(
        this.http.get(`${this.SHEET_URL}?action=add&name=${encodeURIComponent(name)}&hohenmeter=${hohenmeter}`)
      );
      this.toast.show('Eintrag erfolgreich hinzugefügt!');
    } catch (error) {
      console.error('Error submitting data:', error);
      await this.refreshAllData();
      this.toast.show('Fehler beim Hinzufügen des Eintrags!', 4000);
      throw error;
    }
  }

  async deleteData(entry: DataRow): Promise<void> {
    const isUnlocked = await this.lockService.requestUnlock();
    if (!isUnlocked) return;

    try {
      this.updateLocalState(entry, 'delete');
      await firstValueFrom(
        this.http.get(`${this.SHEET_URL}?action=delete&name=${encodeURIComponent(entry.name)}&hohenmeter=${entry.hohenmeter}`)
      );
      this.toast.show('Eintrag gelöscht.');
    } catch (error) {
      console.error('Error deleting data:', error);
      await this.refreshAllData();
      this.toast.show('Fehler beim Löschen des Eintrags!', 4000);
      throw error;
    }
  }

  async loadEvents(): Promise<void> {
    // Only load if not already loaded
    if (this.eventsSubject.value.length > 0) return;
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.SHEET_URL}?action=getEvents`)
      );
      if (response?.events) {
        this.eventsSubject.next(response.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      this.toast.show('Fehler beim Laden der Events!', 4000);
    }
  }

  async addParticipant(eventName: string, participantName: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(
          `${this.SHEET_URL}?action=addParticipant&eventName=${encodeURIComponent(eventName)}&participantName=${encodeURIComponent(participantName)}`
        )
      );

      if (response?.status === 'participant_added') {
        // Use a map for faster lookup if you have many events
        const events = [...this.eventsSubject.value];
        const eventMap = new Map(events.map(e => [e.name, e]));
        const event = eventMap.get(eventName);
        if (event) {
          if (!event.participants) event.participants = [];
          event.participants.push(participantName);
          this.eventsSubject.next(events);
          this.saveToCache(this.entriesSubject.value, events);
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

  private updateLocalState(entry: DataRow, action: 'add' | 'delete'): void {
    const currentEntries = [...this.entriesSubject.value];
    let changed = false;

    if (action === 'add') {
      currentEntries.unshift(entry);
      changed = true;
    } else {
      const index = currentEntries.findIndex(e =>
        e.name === entry.name && e.hohenmeter === entry.hohenmeter
      );
      if (index !== -1) {
        currentEntries.splice(index, 1);
        changed = true;
      }
    }

    if (changed) {
      this.updateState(currentEntries);
      const currentEvents = this.eventsSubject.value;
      this.saveToCache(currentEntries, currentEvents);
    }
  }

  private updateState(entries: DataRow[]): void {
    this.entriesSubject.next(entries);
    this.rankingsSubject.next(this.calculateRankings(entries));
    this.totalHMSubject.next(this.calculateTotal(entries));
    this.chartDataSubject.next(this.calculateChartData(entries));
    this.dataLoaded = entries.length > 0;
  }

  private processEntries(data: any[]): DataRow[] {
    return data.map(row => ({
      name: row[0],
      hohenmeter: parseInt(row[1]),
      date: row[2]
    }));
  }

  private calculateTotal(entries: DataRow[]): number {
    return entries.reduce((sum, entry) => sum + entry.hohenmeter, 0);
  }

  private calculateRankings(entries: DataRow[]): { name: string, hohenmeter: number }[] {
    const userTotals = entries.reduce((acc: { [key: string]: number }, entry) => {
      acc[entry.name] = (acc[entry.name] || 0) + entry.hohenmeter;
      return acc;
    }, {});

    return Object.entries(userTotals)
      .map(([name, hohenmeter]) => ({ name, hohenmeter }))
      .sort((a, b) => b.hohenmeter - a.hohenmeter);
  }

  private calculateChartData(entries: DataRow[]): ChartData {
    // Limit to last 100 entries for performance
    const sortedEntries = [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-100);

    return {
      labels: sortedEntries.map(entry => new Date(entry.date).toLocaleDateString()),
      values: sortedEntries.map(entry => entry.hohenmeter)
    };
  }

  private async fetchAllData(): Promise<any> {
    try {
      // Fetch events with participants
      const eventsWithParticipants = await firstValueFrom(
        this.http.get<any>(`${this.SHEET_URL}?action=getAllParticipants`)
      );

      // Fetch main data (ranking etc.)
      const mainResponse = await firstValueFrom(
        this.http.get<any>(`${this.SHEET_URL}?action=get`)
      );

      // Filter and process events (future events only)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const events = (eventsWithParticipants as any[])
        .filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        })
        .map(event => ({
          ...event,
          daysLeft: this.calculateDaysLeft(event.date),
          participants: event.participants || []
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        main: mainResponse?.main || [],
        ranking: mainResponse?.ranking || [],
        events: events
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      return { main: [], ranking: [], events: [] };
    }
  }

  isDataLoaded(): boolean {
    return this.entriesSubject.value.length > 0;
  }

  private calculateDaysLeft(dateString: string): number {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }
}