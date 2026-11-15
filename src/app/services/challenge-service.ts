import { Injectable } from '@angular/core';
import { ChallengeConfig, ChallengeRanking } from '../interfaces/challenge.interface';

/** Key under which earlier versions cached all HM1 entries; removed on first use. */
const LEGACY_CACHE_KEY = 'gipfelstuermer_entries';

/**
 * Gipfelstürmer (elevation) challenge, finished on 29.06.2025.
 * Frozen: the final ranking ships with the site, nothing is fetched or cached.
 * Snapshot of the 300 HM1 entries in the sheet; individual entries are not kept here.
 */
@Injectable({ providedIn: 'root' })
export class ChallengeService {
  readonly config: ChallengeConfig = {
    id: 'gipfelstuermer-2025',
    title: 'Gipfelstürmer Event 2025',
    active: false,
    metricLabel: 'Höhenmeter',
    metricUnit: 'HM',
    goalValue: 100000,
    maxEntryValue: 1200,
    milestones: [1000, 2500, 5000, 10000, 15000],
    goals: [
      { target: 10000, emoji: '🎭', reward: 'Trainer im Kostüm' },
      { target: 25000, emoji: '🍕', reward: 'Pizza nach dem Lauf' },
      { target: 50000, emoji: '🥤', reward: 'Geheimsnack & Getränke' },
      { target: 75000, emoji: '🍰', reward: 'Erdbeertorte & Urkunden' },
      { target: 100000, emoji: '💃', reward: 'Schabernack!' },
    ],
    chartProfile: [
      { x: 0, y: 0 },
      { x: 10000, y: 10000 },
      { x: 12500, y: 8000 },
      { x: 25000, y: 25000 },
      { x: 29000, y: 20000 },
      { x: 50000, y: 50000 },
      { x: 55000, y: 45000 },
      { x: 75000, y: 75000 },
      { x: 82000, y: 69000 },
      { x: 100000, y: 100000 },
      { x: 103000, y: 93000 },
      { x: 110000, y: 70000 },
    ],
    chartMaxScale: 110000,
  };

  /** Final ranking, highest first. */
  readonly rankings: ChallengeRanking[] = [
    { name: 'Vera', value: 36283 },
    { name: 'Max', value: 30312 },
    { name: 'Peter Müller', value: 8350 },
    { name: 'Vini', value: 5604 },
    { name: 'Bettina', value: 5454 },
    { name: 'Dominik', value: 3920 },
    { name: 'Simon', value: 2168 },
    { name: 'Doreen', value: 1581 },
    { name: 'Micha', value: 1443 },
    { name: 'Tim', value: 1057 },
    { name: 'Nina', value: 993 },
    { name: 'Alice', value: 779 },
    { name: 'Sara', value: 689 },
    { name: 'Georg', value: 640 },
    { name: 'Marco Wiegand', value: 586 },
    { name: 'Joachim', value: 456 },
    { name: 'Lenard', value: 21 },
  ];

  readonly total = this.rankings.reduce((sum, r) => sum + r.value, 0);

  constructor() {
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      /* storage unavailable: nothing to clean up */
    }
  }
}
