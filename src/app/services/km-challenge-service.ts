import { Injectable } from '@angular/core';
import { ChallengeConfig, ChallengeEntry } from '../interfaces/challenge.interface';
import { BaseChallengeService } from './base-challenge.service';

/** Eurotrip kilometer challenge, including the Tuesday boost. */
@Injectable({ providedIn: 'root' })
export class KmChallengeService extends BaseChallengeService {
  protected readonly challengeId = 'KM1';
  protected readonly cacheKey = 'km_challenge_data';

  /** Tuesday boost: entries count x2 for the shared total (personal km stay real). */
  private readonly BOOST = {
    weekday: 'Tue',
    multiplier: 2,
    startDate: '2026-11-10',
    introUntil: '2026-12-01', // last of the first 4 boost Tuesdays
  };

  readonly config: ChallengeConfig = {
    id: 'eurotrip-km-2025',
    title: 'Eurotrip Challenge',
    active: true,
    metricLabel: 'Kilometer',
    metricUnit: 'km',
    goalValue: 12310,
    maxEntryValue: 200,
    milestones: [50, 100, 250, 500, 750, 1000],
    goals: [
      /*{ target:  2630, emoji: '🏖️', reward: 'Wir erreichen Lissabon!' },
      { target:  7330, emoji: '🏺', reward: 'Wir erreichen Athen!' },
      { target: 12310, emoji: '🏆', reward: 'Eurotrip abgeschlossen – zurück in Weinheim!' },*/
    ],
    chartProfile: [],
    chartMaxScale: 0,
  };

  // Creating an Intl.DateTimeFormat is expensive: build it once and memoize results.
  private readonly berlinFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  private readonly boostCache = new Map<string, boolean>();

  protected override calculateTotal(entries: ChallengeEntry[]): number {
    return entries.reduce((sum, e) => sum + e.value * (this.isBoosted(e) ? this.BOOST.multiplier : 1), 0);
  }

  /** Berlin calendar day (YYYY-MM-DD) and weekday for a date, or null if invalid. */
  private berlinDay(date: Date): { day: string; weekday: string } | null {
    if (isNaN(date.getTime())) return null;
    const parts = this.berlinFormatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { day: `${get('year')}-${get('month')}-${get('day')}`, weekday: get('weekday') };
  }

  private isBoostDate(date: Date): boolean {
    const d = this.berlinDay(date);
    return !!d && d.weekday === this.BOOST.weekday && d.day >= this.BOOST.startDate;
  }

  /** Entry counts double for the shared total (not for personal rankings). */
  isBoosted(entry: ChallengeEntry): boolean {
    let v = this.boostCache.get(entry.date);
    if (v === undefined) {
      v = this.isBoostDate(new Date(entry.date));
      this.boostCache.set(entry.date, v);
    }
    return v;
  }

  /** Extra km the Tuesday boost added to the shared total today (the "+1x" part only). */
  boostBonusToday(entries: ChallengeEntry[], now: Date = new Date()): number {
    const today = this.berlinDay(now)?.day;
    if (!today || !this.isBoostDate(now)) return 0;
    return entries
      .filter((e) => this.berlinDay(new Date(e.date))?.day === today)
      .reduce((sum, e) => sum + e.value * (this.BOOST.multiplier - 1), 0);
  }

  /** Whether the given day (default: today) is a boost day. */
  isBoostDay(date: Date = new Date()): boolean {
    return this.isBoostDate(date);
  }

  /** Intro card is only shown on the first 4 boost Tuesdays. */
  showBoostIntro(date: Date = new Date()): boolean {
    const d = this.berlinDay(date);
    return !!d && this.isBoostDate(date) && d.day <= this.BOOST.introUntil;
  }
}
