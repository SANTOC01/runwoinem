import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, shareReplay } from 'rxjs';
import { ChallengeConfig, ChallengeEntry, ChallengeRanking } from '../interfaces/challenge.interface';
import { BaseChallengeService } from './base-challenge.service';
import { ChartData } from '../models/chart-data';

@Injectable({
  providedIn: 'root'
})
export class KmChallengeService extends BaseChallengeService {
  readonly config: ChallengeConfig = {
    id: 'eurotrip-km-2025',
    title: 'Eurotrip 1000km Challenge',
    active: false,
    metricLabel: 'Kilometer',
    metricUnit: 'km',
    goalValue: 1000,
    maxEntryValue: 200,
    goals: [
      { target: 100,  emoji: '🎯', reward: 'Erste 100km!' },
      { target: 500,  emoji: '🏅', reward: 'Halbzeit!' },
      { target: 1000, emoji: '🏆', reward: '1000km Eurotrip abgeschlossen!' }
    ],
    // Eurotrip route: Cologne → Netherlands → Belgium → France → Spain → Portugal
    // x represents geographic position (east–west), y = cumulative km progress
    chartProfile: [
      { x: 0,   y: 0    },  // Köln (start)
      { x: 180, y: 100  },  // Rotterdam / North Sea loop
      { x: 100, y: 200  },  // Brussels
      { x: 280, y: 300  },  // Paris
      { x: 200, y: 400  },  // Loire Valley
      { x: 320, y: 500  },  // Biarritz / Pyrenees
      { x: 240, y: 600  },  // San Sebastián
      { x: 380, y: 700  },  // Madrid
      { x: 260, y: 800  },  // Western Spain
      { x: 160, y: 900  },  // Porto
      { x: 60,  y: 1000 },  // Lisbon – finish!
      { x: 0,   y: 1050 }   // buffer
    ],
    chartMaxScale: 400
  };

  private entriesSubject   = new BehaviorSubject<ChallengeEntry[]>([]);
  private rankingsSubject  = new BehaviorSubject<ChallengeRanking[]>([]);
  private totalSubject     = new BehaviorSubject<number>(0);
  private chartDataSubject = new BehaviorSubject<ChartData>({ labels: [], values: [] });

  readonly entries$:   Observable<ChallengeEntry[]>   = this.entriesSubject.asObservable().pipe(shareReplay(1));
  readonly rankings$:  Observable<ChallengeRanking[]> = this.rankingsSubject.asObservable().pipe(shareReplay(1));
  readonly total$:     Observable<number>             = this.totalSubject.asObservable().pipe(shareReplay(1));
  readonly chartData$: Observable<ChartData>          = this.chartDataSubject.asObservable().pipe(shareReplay(1));

  constructor() {
    super();
  }

  async loadData(): Promise<void> {
    // Not yet implemented – will be wired up when the km challenge goes live
  }

  async submitData(_name: string, _value: number): Promise<void> {
    throw new Error('KmChallengeService.submitData() not yet implemented.');
  }

  async deleteData(_entry: ChallengeEntry): Promise<void> {
    throw new Error('KmChallengeService.deleteData() not yet implemented.');
  }
}
