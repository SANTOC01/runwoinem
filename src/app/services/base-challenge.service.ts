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
  WeekSummary,
} from '../interfaces/challenge.interface';
import { detectRankUp, detectRecords, isCollection, nextTarget, roundValue } from '../utils/challenge-utils';
import { ChartData } from '../models/chart-data';
import { LockService } from './lock-service';
import { ToastService } from './toast-service';
import { SheetApi } from './sheet-api.service';
import { readCache, writeCache } from './local-cache';

const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Rows are [name, value, date, id?, kind?]; `week` comes from newer backends only. */
interface EntriesResponse {
  main?: unknown[][];
  week?: WeekSummary | null;
}

/** Answer to add/delete. Newer backends include the fresh list and the saved entry. */
interface MutationResponse extends EntriesResponse {
  entry?: [string, number, string, string, string?];
}

/** Bump when the cached shape or meaning changes; other versions are refetched. */
const CACHE_VERSION = 2;

interface CachedData {
  v: number;
  entries: ChallengeEntry[];
  week: WeekSummary | null;
}

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
  private readonly weekSignal = signal<WeekSummary | null>(null);
  private dataLoaded = false;
  private fetchedAt: number | null = null;

  /** Progress of the latest new entry, from after the unlock until the backend answered. */
  readonly saveState = this.saveStateSignal.asReadonly();
  /** This week's leader and riser as computed by the backend (null with older backends). */
  readonly week = this.weekSignal.asReadonly();

  readonly entries$ = this.entriesSubject.asObservable();
  readonly rankings$ = this.rankingsSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();
  readonly chartData$ = this.chartDataSubject.asObservable();

  async loadData(): Promise<void> {
    if (this.dataLoaded) return;
    const cached = readCache<Partial<CachedData>>(this.cacheKey, (ts) => Date.now() - ts < CACHE_DURATION_MS);
    // Older versions cached other shapes (e.g. without collection flags): fetch fresh instead.
    if (cached?.data?.v === CACHE_VERSION && Array.isArray(cached.data.entries)) {
      this.updateState(cached.data.entries, cached.data.week ?? null);
      this.fetchedAt = cached.timestamp;
      return;
    }
    await this.refreshAllData();
  }

  async refreshAllData(): Promise<void> {
    try {
      const response = await this.api.get<EntriesResponse>('getAll', { challenge: this.challengeId });
      this.applyServerData(response ?? {});
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

  /**
   * Adds an entry. `runDate` (YYYY-MM-DD, local) logs a run from an earlier day; default today.
   * `collection` is the runner's answer to "several runs at once?" (undefined if not asked).
   * Resolves to what changed for the person (null if nothing was submitted).
   */
  async submitData(name: string, value: number, runDate?: string, collection?: boolean): Promise<SubmitResult | null> {
    if (!this.config.active) {
      this.toast.show('Die Challenge ist beendet. Keine Einträge mehr möglich. 🔒');
      return null;
    }
    if (value > this.config.maxEntryValue) {
      this.toast.show(`Maximal ${this.config.maxEntryValue} ${this.config.metricUnit} pro Eintrag 😉`, 4000);
      return null;
    }
    name = name.trim();
    if (!(await this.lockService.requestUnlock())) return null;

    let before = this.entriesSubject.value;
    const date = runDate ? new Date(`${runDate}T12:00:00`).toISOString() : new Date().toISOString();
    this.saveStateSignal.set('saving');
    let response: MutationResponse | null;
    try {
      // Shown rounded right away; the sheet keeps the exact value.
      const kind = collection === undefined ? undefined : collection ? 'collection' : 'single';
      const rounded = roundValue(value);
      response = await this.mutate(
        { name, value: rounded, date, ...(this.collectionFlag(rounded, kind) ? { collection: true } : {}) },
        'add',
        'Eintrag erfolgreich hinzugefügt!',
        'Fehler beim Hinzufügen des Eintrags!',
        { hohenmeter: value, ...(runDate ? { date: runDate } : {}), ...(kind ? { kind } : {}) },
      );
    } catch (error) {
      this.saveStateSignal.set('error');
      throw error;
    }
    this.saveStateSignal.set('done');

    // With a fresh list from the server, compare against exactly that list without the new
    // entry, so celebrations stay correct even if others logged since this page loaded.
    const id = response?.entry?.[3];
    if (response?.main && id) {
      name = String(response.entry?.[0] ?? name);
      before = this.entriesSubject.value.filter((e) => e.id !== id);
    }
    return this.submitResult(name, before, this.entriesSubject.value);
  }

  private submitResult(name: string, before: ChallengeEntry[], after: ChallengeEntry[]): SubmitResult {
    const rankingsBefore = this.calculateRankings(before);
    const rankingsAfter = this.calculateRankings(after);
    const totalBefore = this.calculateTotal(before);
    const totalAfter = this.calculateTotal(after);
    const stop = this.nextStop?.(totalAfter) ?? null;
    return {
      name,
      rankUp: detectRankUp(rankingsBefore, rankingsAfter, name),
      records: detectRecords(before, after, name, this.config.milestones),
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

  /**
   * Optimistically updates local state, then syncs with the backend (reloads on error).
   * When the backend answers with the fresh entry list, that list replaces the local state.
   */
  private async mutate(
    entry: ChallengeEntry,
    action: 'add' | 'delete',
    okMessage: string,
    errorMessage: string,
    extra: Record<string, unknown> = {},
  ): Promise<MutationResponse | null> {
    try {
      this.updateLocalState(entry, action);
      const response = await this.api.post<MutationResponse | null>({
        action,
        name: entry.name,
        hohenmeter: entry.value,
        challenge: this.challengeId,
        ...(entry.id ? { id: entry.id } : {}),
        ...extra,
      });
      if (response?.main) this.applyServerData(response);
      this.toast.show(okMessage);
      return response;
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
      const index = entry.id
        ? entries.findIndex((e) => e.id === entry.id)
        : entries.findIndex((e) => e.name === entry.name && e.value === entry.value);
      if (index === -1) return;
      entries.splice(index, 1);
    }
    this.updateState(entries, this.weekSignal());
    this.writeLocalCache();
  }

  /** Takes over the server's entries and week summary (newer backends send them with every answer). */
  private applyServerData(response: EntriesResponse): void {
    this.updateState(this.processEntries(response.main ?? []), response.week ?? null);
    this.writeLocalCache();
  }

  private writeLocalCache(): void {
    writeCache<CachedData>(this.cacheKey, {
      v: CACHE_VERSION,
      entries: this.entriesSubject.value,
      week: this.weekSignal(),
    });
  }

  private updateState(entries: ChallengeEntry[], week: WeekSummary | null): void {
    this.entriesSubject.next(entries);
    this.rankingsSubject.next(this.calculateRankings(entries));
    this.totalSubject.next(this.calculateTotal(entries));
    this.chartDataSubject.next(this.calculateChartData(entries));
    this.weekSignal.set(week);
    this.dataLoaded = true;
  }

  /** Rows are [name, value, date, id?, kind?]; `kind` is 'collection' | 'single' | '' (not asked). */
  private processEntries(data: unknown[][]): ChallengeEntry[] {
    return data.map((row) => {
      const [name, raw, date, id, kind] = row as [string, unknown, string, unknown, unknown];
      const value = roundValue(raw);
      const entry: ChallengeEntry = { name, value, date };
      if (id) entry.id = String(id);
      if (this.collectionFlag(value, kind ? String(kind) : undefined)) entry.collection = true;
      return entry;
    });
  }

  /** Collection rules only apply to challenges that configure them (see `ChallengeConfig.collections`). */
  private collectionFlag(value: number, kind: string | undefined): boolean {
    const rules = this.config.collections;
    return !!rules && isCollection(value, kind, rules.legacyAbove);
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
