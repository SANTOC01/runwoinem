import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { LockService } from './lock-service';
import { ToastService } from './toast-service';
import { ChartData } from '../models/chart-data';
import { ChallengeConfig, ChallengeEntry, ChallengeRanking } from '../interfaces/challenge.interface';
import { BaseChallengeService } from './base-challenge.service';
import { environment } from '../../environments/environment';

interface CacheData {
  entries: ChallengeEntry[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class KmChallengeService extends BaseChallengeService {
  private readonly SHEET_URL = environment.gipfelstuermerSheetUrl;
  private readonly CACHE_KEY = 'km_challenge_data';
  private readonly CHALLENGE_ID = 'KM1';
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  readonly config: ChallengeConfig = {
    id: 'eurotrip-km-2025',
    title: 'Eurotrip Challenge',
    active: true,
    metricLabel: 'Kilometer',
    metricUnit: 'km',
    goalValue: 50000,
    maxEntryValue: 200,
    goals: [
      /*{ target:  2630, emoji: '🏖️', reward: 'Wir erreichen Lissabon!' },
      { target:  7330, emoji: '🏺', reward: 'Wir erreichen Athen!' },
      { target: 15010, emoji: '🔄', reward: 'Erste Runde abgeschlossen!' },
      { target: 30020, emoji: '🔄', reward: 'Zweite Runde abgeschlossen!' },
      { target: 45030, emoji: '🔄', reward: 'Dritte Runde abgeschlossen!' },
      { target: 50000, emoji: '🏆', reward: '50.000km – Eurotrip Legende!' },*/
    ],
    chartProfile: [],
    chartMaxScale: 0
  };

  private entriesSubject   = new BehaviorSubject<ChallengeEntry[]>([]);
  private rankingsSubject  = new BehaviorSubject<ChallengeRanking[]>([]);
  private totalSubject     = new BehaviorSubject<number>(0);
  private chartDataSubject = new BehaviorSubject<ChartData>({ labels: [], values: [] });
  private dataLoaded = false;

  readonly entries$:   Observable<ChallengeEntry[]>   = this.entriesSubject.asObservable();
  readonly rankings$:  Observable<ChallengeRanking[]> = this.rankingsSubject.asObservable();
  readonly total$:     Observable<number>             = this.totalSubject.asObservable();
  readonly chartData$: Observable<ChartData>          = this.chartDataSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
    private lockService: LockService,
    private toast: ToastService
  ) {
    super();
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
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
        const { entries, timestamp } = JSON.parse(cached) as CacheData;
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.updateState(entries);
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

  private saveToCache(entries: ChallengeEntry[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const cache: CacheData = { entries, timestamp: Date.now() };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  public async refreshAllData(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ main: unknown[][] }>(`${this.SHEET_URL}?action=get&challenge=${this.CHALLENGE_ID}`)
      );
      const entries = this.processEntries(response?.main ?? []);
      this.updateState(entries);
      this.saveToCache(entries);
      this.dataLoaded = true;
    } catch (error) {
      console.error('Error refreshing KM data:', error);
      this.toast.show('Fehler beim Laden der Daten!', 4000);
    }
  }

  async loadData(): Promise<void> {
    if (this.dataLoaded) return;
    await this.refreshAllData();
  }

  async submitData(name: string, value: number): Promise<void> {
    if (!this.config.active) {
      this.toast.show('Die Challenge ist beendet. Keine Einträge mehr möglich. 🔒');
      return;
    }

    const isUnlocked = await this.lockService.requestUnlock();
    if (!isUnlocked) return;

    const newEntry: ChallengeEntry = { name, value, date: new Date().toISOString() };

    try {
      this.updateLocalState(newEntry, 'add');
      await firstValueFrom(
        this.http.get(`${this.SHEET_URL}?action=add&name=${encodeURIComponent(name)}&hohenmeter=${value}&challenge=${this.CHALLENGE_ID}`)
      );
      this.toast.show('Eintrag erfolgreich hinzugefügt!');
    } catch (error) {
      console.error('Error submitting KM data:', error);
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
        this.http.get(`${this.SHEET_URL}?action=delete&name=${encodeURIComponent(entry.name)}&hohenmeter=${entry.value}&challenge=${this.CHALLENGE_ID}`)
      );
      this.toast.show('Eintrag gelöscht.');
    } catch (error) {
      console.error('Error deleting KM data:', error);
      await this.refreshAllData();
      this.toast.show('Fehler beim Löschen des Eintrags!', 4000);
      throw error;
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
      this.saveToCache(currentEntries);
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
    return this.entriesSubject.value.length > 0;
  }
}
