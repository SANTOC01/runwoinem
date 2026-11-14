import { inject, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Arrival,
  ChallengeConfig,
  ChallengeEntry,
  ChallengeRanking,
  NextStop,
  SaveState,
  SubmitResult,
} from '../interfaces/challenge.interface';
import { detectRankUp, detectRecords, nextTarget } from '../utils/challenge-utils';
import { ChartData } from '../models/chart-data';
import { LockService } from './lock-service';
import { ToastService } from './toast-service';
import { SheetApi } from './sheet-api.service';
import { readCache, writeCache } from './local-cache';

const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Shared load / cache / submit / delete / ranking logic for all challenges. */
export abstract class BaseChallengeService {
  abstract readonly config: ChallengeConfig;
  /** Challenge key understood by the sheet backend (e.g. "HM1"). */
  protected abstract readonly challengeId: string;
  protected abstract readonly cacheKey: string;

  protected readonly api = inject(SheetApi);
  private readonly lockService = inject(LockService);
  private readonly toast = inject(ToastService);

  private readonly entriesSubject = new BehaviorSubject<ChallengeEntry[]>([]);
  private readonly rankingsSubject = new BehaviorSubject<ChallengeRanking[]>([]);
  private readonly totalSubject = new BehaviorSubject<number>(0);
  private readonly chartDataSubject = new BehaviorSubject<ChartData>({ labels: [], values: [] });
  private readonly saveStateSignal = signal<SaveState>('idle');
  private dataLoaded = false;
  private fetchedAt: number | null = null;

  /** Progress of the latest new entry, from after the unlock until the backend answered. */
  readonly saveState = this.saveStateSignal.asReadonly();

  readonly entries$ = this.entriesSubject.asObservable();
  readonly rankings$ = this.rankingsSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();
  readonly chartData$ = this.chartDataSubject.asObservable();

  async loadData(): Promise<void> {
    if (this.dataLoaded) return;
    const cached = readCache<ChallengeEntry[]>(this.cacheKey, (ts) => Date.now() - ts < CACHE_DURATION_MS);
    if (cached) {
      this.updateState(cached.data);
      this.fetchedAt = cached.timestamp;
      return;
    }
    await this.refreshAllData();
  }

  async refreshAllData(): Promise<void> {
    try {
      const response = await this.api.get<{ main?: unknown[][] }>('getAll', { challenge: this.challengeId });
      const entries = this.processEntries(response?.main ?? []);
      this.updateState(entries);
      writeCache(this.cacheKey, entries);
      this.fetchedAt = Date.now();
    } catch (error) {
      console.error(`Error refreshing ${this.challengeId} data:`, error);
      this.toast.show('Fehler beim Laden der Daten!', 4000);
    }
  }

  /** True if data was fetched or loaded from cache within the last `withinMs` ms. */
  isFreshlyLoaded(withinMs = 30_000): boolean {
    return this.fetchedAt !== null && Date.now() - this.fetchedAt < withinMs;
  }

  /** Adds an entry. Resolves to what changed for the person (null if nothing was submitted). */
  async submitData(name: string, value: number): Promise<SubmitResult | null> {
    if (!this.config.active) {
      this.toast.show('Die Challenge ist beendet. Keine Einträge mehr möglich. 🔒');
      return null;
    }
    name = name.trim();
    if (!(await this.lockService.requestUnlock())) return null;

    const entriesBefore = this.entriesSubject.value;
    const rankingsBefore = this.rankingsSubject.value;
    const totalBefore = this.totalSubject.value;
    this.saveStateSignal.set('saving');
    try {
      await this.mutate(
        { name, value, date: new Date().toISOString() },
        'add',
        'Eintrag erfolgreich hinzugefügt!',
        'Fehler beim Hinzufügen des Eintrags!',
      );
    } catch (error) {
      this.saveStateSignal.set('error');
      throw error;
    }
    this.saveStateSignal.set('done');

    const rankingsAfter = this.rankingsSubject.value;
    const totalAfter = this.totalSubject.value;
    const stop = this.nextStop?.(totalAfter) ?? null;
    return {
      name,
      rankUp: detectRankUp(rankingsBefore, rankingsAfter, name),
      records: detectRecords(entriesBefore, this.entriesSubject.value, name, this.config.milestones),
      nextTarget: nextTarget(rankingsAfter, name),
      arrival: this.detectArrival?.(totalBefore, totalAfter) ?? null,
      route: stop ? { ...stop, added: totalAfter - totalBefore } : null,
    };
  }

  /** Optional: a stop on the shared route reached by moving the total from `before` to `after`. */
  protected detectArrival?(before: number, after: number): Arrival | null;

  /** Optional: the next stop on the shared route for a total. */
  protected nextStop?(total: number): NextStop | null;

  async deleteData(entry: ChallengeEntry): Promise<void> {
    if (!(await this.lockService.requestUnlock())) return;
    await this.mutate(entry, 'delete', 'Eintrag gelöscht.', 'Fehler beim Löschen des Eintrags!');
  }

  /** Optimistically updates local state, then syncs with the backend (reloads on error). */
  private async mutate(
    entry: ChallengeEntry,
    action: 'add' | 'delete',
    okMessage: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      this.updateLocalState(entry, action);
      await this.api.post({ action, name: entry.name, hohenmeter: entry.value, challenge: this.challengeId });
      this.toast.show(okMessage);
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      await this.refreshAllData();
      this.toast.show(errorMessage, 4000);
      throw error;
    }
  }

  private updateLocalState(entry: ChallengeEntry, action: 'add' | 'delete'): void {
    const entries = [...this.entriesSubject.value];
    if (action === 'add') {
      entries.unshift(entry);
    } else {
      const index = entries.findIndex((e) => e.name === entry.name && e.value === entry.value);
      if (index === -1) return;
      entries.splice(index, 1);
    }
    this.updateState(entries);
    writeCache(this.cacheKey, entries);
  }

  private updateState(entries: ChallengeEntry[]): void {
    this.entriesSubject.next(entries);
    this.rankingsSubject.next(this.calculateRankings(entries));
    this.totalSubject.next(this.calculateTotal(entries));
    this.chartDataSubject.next(this.calculateChartData(entries));
    this.dataLoaded = true;
  }

  private processEntries(data: unknown[][]): ChallengeEntry[] {
    return data.map((row) => {
      const [name, value, date] = row as [string, string, string];
      return { name, value: parseInt(value, 10), date };
    });
  }

  /** Total for the shared goal. Subclasses can weight entries (e.g. boost days). */
  protected calculateTotal(entries: ChallengeEntry[]): number {
    return entries.reduce((sum, e) => sum + e.value, 0);
  }

  private calculateRankings(entries: ChallengeEntry[]): ChallengeRanking[] {
    const totals = new Map<string, number>();
    for (const e of entries) totals.set(e.name, (totals.get(e.name) ?? 0) + e.value);
    return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  private calculateChartData(entries: ChallengeEntry[]): ChartData {
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-100);
    return {
      labels: sorted.map((e) => new Date(e.date).toLocaleDateString()),
      values: sorted.map((e) => e.value),
    };
  }
}
