import { Injectable } from '@angular/core';
import { ChallengeConfig } from '../interfaces/challenge.interface';
import { BaseChallengeService } from './base-challenge.service';

/** Gipfelstürmer (elevation) challenge. */
@Injectable({ providedIn: 'root' })
export class ChallengeService extends BaseChallengeService {
  protected readonly challengeId = 'HM1';
  protected readonly cacheKey = 'gipfelstuermer_entries';

  readonly config: ChallengeConfig = {
    id: 'gipfelstuermer-2025',
    title: 'Gipfelstürmer Event 2025',
    active: false,
    metricLabel: 'Höhenmeter',
    metricUnit: 'HM',
    goalValue: 100000,
    maxEntryValue: 1200,
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
}
