import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ChallengeService } from './challenge-service';
import { KmChallengeService } from './km-challenge-service';
import { LockService } from './lock-service';
import { SheetApi } from './sheet-api.service';

describe('Challenge services', () => {
  let api: jasmine.SpyObj<SheetApi>;
  let lock: jasmine.SpyObj<LockService>;

  const configure = () =>
    TestBed.configureTestingModule({
      providers: [
        { provide: SheetApi, useValue: api },
        { provide: LockService, useValue: lock },
      ],
    });

  beforeEach(() => {
    localStorage.clear();
    api = jasmine.createSpyObj('SheetApi', ['get', 'post']);
    lock = jasmine.createSpyObj('LockService', ['requestUnlock']);
    lock.requestUnlock.and.resolveTo(true);
    api.post.and.resolveTo({});
    configure();
  });
  afterEach(() => localStorage.clear());

  describe('ChallengeService (HM1)', () => {
    it('loads entries and computes rankings, total and chart data', async () => {
      api.get.and.resolveTo({
        main: [
          ['Anna', '300', '2025-01-02T10:00:00Z'],
          ['Ben', '500', '2025-01-01T10:00:00Z'],
          ['Anna', '400', '2025-01-03T10:00:00Z'],
        ],
      });
      const service = TestBed.inject(ChallengeService);
      await service.loadData();

      expect(api.get).toHaveBeenCalledWith('getAll', { challenge: 'HM1' });
      expect(await firstValueFrom(service.total$)).toBe(1200);
      expect(await firstValueFrom(service.rankings$)).toEqual([
        { name: 'Anna', value: 700 },
        { name: 'Ben', value: 500 },
      ]);
      expect((await firstValueFrom(service.chartData$)).values).toEqual([500, 300, 400]);
    });

    it('uses a fresh cache instead of fetching', async () => {
      api.get.and.resolveTo({ main: [['Anna', '10', '2025-01-01T10:00:00Z']] });
      await TestBed.inject(ChallengeService).loadData();

      // Simulate a second visit: new service instance, same localStorage.
      TestBed.resetTestingModule();
      configure();
      api.get.calls.reset();
      const again = TestBed.inject(ChallengeService);
      await again.loadData();

      expect(api.get).not.toHaveBeenCalled();
      expect(await firstValueFrom(again.total$)).toBe(10);
      expect(again.isFreshlyLoaded()).toBeTrue();
    });

    it('refuses new entries when the challenge is inactive', async () => {
      const service = TestBed.inject(ChallengeService);
      await service.submitData('Anna', 10);
      expect(lock.requestUnlock).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('KmChallengeService (KM1)', () => {
    it('adds, then deletes an entry via the backend', async () => {
      api.get.and.resolveTo({ main: [] });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();

      await service.submitData('  Anna ', 12);
      expect(api.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'add', name: 'Anna', hohenmeter: 12, challenge: 'KM1' }),
      );
      const [entry] = await firstValueFrom(service.entries$);
      expect(entry.name).toBe('Anna');

      await service.deleteData(entry);
      expect(await firstValueFrom(service.entries$)).toEqual([]);
    });

    it('returns a rank-up when an entry climbs the ranking', async () => {
      api.get.and.resolveTo({
        main: [
          ['Anna', '30', '2025-01-01T10:00:00Z'],
          ['Ben', '20', '2025-01-01T10:00:00Z'],
          ['Cleo', '10', '2025-01-01T10:00:00Z'],
        ],
      });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();

      const first = await service.submitData('Cleo', 15);
      expect(first?.rankUp).toEqual({ name: 'Cleo', from: 3, to: 2, overtaken: ['Ben'] });
      expect(first?.nextTarget).toEqual({ name: 'Anna', place: 1, needed: 6 });
      // 15 beats her longest run (10) and, in a new week, her best week (10).
      expect(first?.records).toEqual([
        { kind: 'longest', value: 15 },
        { kind: 'bestWeek', value: 15 },
      ]);

      const second = await service.submitData('Cleo', 1);
      expect(second?.rankUp).toBeNull();
    });

    it('reports the extra km added by the Tuesday boost today', () => {
      const service = TestBed.inject(KmChallengeService);
      const tuesday = new Date('2026-11-10T12:00:00Z');
      const entries = [
        { name: 'Anna', value: 10, date: '2026-11-10T08:00:00Z' },
        { name: 'Ben', value: 5, date: '2026-11-10T09:00:00Z' },
        { name: 'Anna', value: 7, date: '2026-11-03T09:00:00Z' }, // earlier Tuesday
      ];
      expect(service.boostBonusToday(entries, tuesday)).toBe(15);
      expect(service.boostBonusToday(entries, new Date('2026-11-11T12:00:00Z'))).toBe(0);
    });

    it('does nothing when unlock is cancelled', async () => {
      lock.requestUnlock.and.resolveTo(false);
      const service = TestBed.inject(KmChallengeService);
      await service.submitData('Anna', 5);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('rolls back by reloading when the backend call fails', async () => {
      api.get.and.resolveTo({ main: [] });
      api.post.and.rejectWith(new Error('offline'));
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();

      await expectAsync(service.submitData('Anna', 5)).toBeRejected();
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(await firstValueFrom(service.entries$)).toEqual([]);
    });

    it('doubles boosted Tuesdays in the total but not in rankings', async () => {
      api.get.and.resolveTo({
        main: [
          ['Anna', '10', '2026-11-10T17:00:00Z'], // Tuesday on/after start -> x2
          ['Anna', '10', '2026-11-11T17:00:00Z'], // Wednesday
          ['Ben', '10', '2026-11-03T17:00:00Z'], // Tuesday before start
        ],
      });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();

      expect(await firstValueFrom(service.total$)).toBe(10 * 2 + 10 + 10);
      expect((await firstValueFrom(service.rankings$))[0]).toEqual({ name: 'Anna', value: 20 });
    });

    it('detects boost days and the intro window', () => {
      const service = TestBed.inject(KmChallengeService);
      expect(service.isBoostDay(new Date('2026-11-10T12:00:00Z'))).toBeTrue();
      expect(service.isBoostDay(new Date('2026-11-11T12:00:00Z'))).toBeFalse();
      expect(service.showBoostIntro(new Date('2026-12-01T12:00:00Z'))).toBeTrue();
      expect(service.showBoostIntro(new Date('2026-12-08T12:00:00Z'))).toBeFalse();
    });
  });
});
