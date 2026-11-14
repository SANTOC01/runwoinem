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

    it('reports route progress and reaching the next Eurotrip city', async () => {
      // Total 180 km, Köln is at 190 km. No boost, whatever weekday the test runs on.
      api.get.and.resolveTo({ main: [['Anna', '180', '2025-01-01T10:00:00Z']] });
      const service = TestBed.inject(KmChallengeService);
      spyOn(service, 'isBoosted').and.returnValue(false);
      await service.loadData();

      const small = await service.submitData('Ben', 5);
      expect(small?.arrival).toBeNull();
      expect(small?.route).toEqual({ name: 'Köln', remaining: 5, added: 5 });
      const result = await service.submitData('Ben', 10);
      expect(result?.name).toBe('Ben');
      expect(result?.arrival).toEqual({ name: 'Köln', emoji: '📍', finish: false });
      expect(result?.route?.name).toBe('Paris');
    });

    it('uses the fresh list from a newer backend: ids, canonical name, run date, week', async () => {
      const day = '2025-01-01T10:00:00Z';
      api.get.and.resolveTo({
        main: [
          ['Anna', 30, day, 'a1'],
          ['Ben', 20, day, 'b1'],
        ],
      });
      const service = TestBed.inject(KmChallengeService);
      spyOn(service, 'isBoosted').and.returnValue(false);
      await service.loadData();

      // Meanwhile Cleo logged 25 km on another phone; this page doesn't know yet.
      api.post.and.resolveTo({
        status: 'success',
        entry: ['Ben', 15, day, 'n1'],
        main: [
          ['Anna', 30, day, 'a1'],
          ['Ben', 20, day, 'b1'],
          ['Cleo', 25, day, 'c1'],
          ['Ben', 15, day, 'n1'],
        ],
        week: { total: 40, leader: { name: 'Ben', value: 15 }, riser: null },
      });
      const result = await service.submitData('ben', 15, '2026-11-10');

      expect(api.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'add', name: 'ben', hohenmeter: 15, date: '2026-11-10' }),
      );
      expect(result?.name).toBe('Ben');
      // Ranked 3rd behind Anna and Cleo before, 1st after.
      expect(result?.rankUp).toEqual({ name: 'Ben', from: 3, to: 1, overtaken: ['Anna', 'Cleo'] });
      expect(service.week()?.leader?.name).toBe('Ben');

      const entries = await firstValueFrom(service.entries$);
      expect(entries.map((e) => e.id)).toEqual(['a1', 'b1', 'c1', 'n1']);

      api.post.and.resolveTo({ status: 'deleted' });
      await service.deleteData(entries[1]);
      expect(api.post).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'delete', id: 'b1' }));
      expect((await firstValueFrom(service.entries$)).map((e) => e.id)).toEqual(['a1', 'c1', 'n1']);
    });

    it('refuses values above the per-entry maximum before asking for the unlock', async () => {
      expect(await TestBed.inject(KmChallengeService).submitData('Anna', 201)).toBeNull();
      expect(lock.requestUnlock).not.toHaveBeenCalled();
    });

    it('fetches fresh data instead of using a cache from an older version', async () => {
      localStorage.setItem(
        'km_challenge_data',
        JSON.stringify({ data: [{ name: 'Anna', value: 7, date: '2025-01-01T10:00:00Z' }], timestamp: Date.now() }),
      );
      api.get.and.resolveTo({ main: [['Ben', 5, '2025-01-01T10:00:00Z', 'b1', '']] });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();
      expect(api.get).toHaveBeenCalled();
      expect((await firstValueFrom(service.entries$))[0].name).toBe('Ben');
    });

    it('marks collections from the answer or, for old entries, above 53 km', async () => {
      const day = '2025-01-01T10:00:00Z';
      api.get.and.resolveTo({
        main: [
          ['Anna', 102, day, 'a1', ''], // old entry, no answer: collection
          ['Anna', 53, day, 'a2'], // old entry at the limit: single run
          ['Ben', 35, day, 'b1', 'collection'],
          ['Ben', 60, day, 'b2', 'single'], // "Respekt.."
        ],
      });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();
      const flags = (await firstValueFrom(service.entries$)).map((e) => !!e.collection);
      expect(flags).toEqual([true, false, true, false]);
    });

    it('sends the answer to "several runs?" with the entry', async () => {
      api.get.and.resolveTo({ main: [] });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();
      await service.submitData('Anna', 35, undefined, true);
      expect(api.post).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'add', kind: 'collection' }));
      expect((await firstValueFrom(service.entries$))[0].collection).toBeTrue();

      await service.submitData('Anna', 60, undefined, false);
      expect(api.post).toHaveBeenCalledWith(jasmine.objectContaining({ hohenmeter: 60, kind: 'single' }));

      api.post.calls.reset();
      await service.submitData('Anna', 5);
      expect(api.post.calls.mostRecent().args[0]).not.toEqual(jasmine.objectContaining({ kind: jasmine.anything() }));
    });

    it('tracks the save state of a new entry', async () => {
      api.get.and.resolveTo({ main: [] });
      const service = TestBed.inject(KmChallengeService);
      await service.loadData();
      expect(service.saveState()).toBe('idle');

      let release!: () => void;
      api.post.and.returnValue(new Promise((resolve) => (release = () => resolve({}))));
      const pending = service.submitData('Anna', 5);
      await new Promise((r) => setTimeout(r)); // let the unlock resolve
      expect(service.saveState()).toBe('saving');
      release();
      await pending;
      expect(service.saveState()).toBe('done');

      api.post.and.rejectWith(new Error('offline'));
      await expectAsync(service.submitData('Anna', 5)).toBeRejected();
      expect(service.saveState()).toBe('error');
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
