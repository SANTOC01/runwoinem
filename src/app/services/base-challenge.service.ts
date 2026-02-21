import { Observable } from 'rxjs';
import { ChallengeConfig, ChallengeEntry, ChallengeRanking } from '../interfaces/challenge.interface';
import { ChartData } from '../models/chart-data';

export abstract class BaseChallengeService {
  abstract readonly config: ChallengeConfig;
  abstract readonly entries$: Observable<ChallengeEntry[]>;
  abstract readonly rankings$: Observable<ChallengeRanking[]>;
  abstract readonly total$: Observable<number>;
  abstract readonly chartData$: Observable<ChartData>;

  abstract loadData(): Promise<void>;
  abstract submitData(name: string, value: number): Promise<void>;
  abstract deleteData(entry: ChallengeEntry): Promise<void>;
}
