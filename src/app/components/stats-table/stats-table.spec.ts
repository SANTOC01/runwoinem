import { TestBed } from '@angular/core/testing';
import { StatsTable } from './stats-table';
import { OwnEntriesService } from '../../services/own-entries.service';
import { ChallengeEntry } from '../../interfaces/challenge.interface';

describe('StatsTable: delete buttons', () => {
  const entries: ChallengeEntry[] = [
    { name: 'Ben', value: 5, date: '2026-11-15T10:00:00Z', id: 'b2' },
    { name: 'Vini', value: 12, date: '2026-11-14T10:00:00Z', id: 'v2' },
    { name: 'Ben', value: 8, date: '2026-11-13T10:00:00Z', id: 'b1' },
    { name: 'Vini', value: 10, date: '2026-11-12T12:00:00Z', id: 'v1' },
  ];

  const deletableIds = (table: StatsTable) =>
    table
      .rows()
      .filter((r) => r.deletable)
      .map((r) => r.entry.id);

  function create(): StatsTable {
    const fixture = TestBed.createComponent(StatsTable);
    fixture.componentRef.setInput('entries', entries);
    return fixture.componentInstance;
  }

  beforeEach(() => localStorage.removeItem('own_entries'));
  afterEach(() => localStorage.removeItem('own_entries'));

  it('offers no delete without own entries, not even on the newest one', () => {
    expect(deletableIds(create())).toEqual([]);
  });

  it('offers delete only on entries submitted from this device', () => {
    const table = create();
    TestBed.inject(OwnEntriesService).add('v1'); // a backdated run, far down the list
    expect(deletableIds(table)).toEqual(['v1']);
  });
});

describe('OwnEntriesService', () => {
  beforeEach(() => {
    localStorage.removeItem('own_entries');
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-15T12:00:00Z'));
  });
  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.removeItem('own_entries');
  });

  it('remembers ids across visits for a week, then forgets them', () => {
    TestBed.inject(OwnEntriesService).add('a1');

    // A later visit reads them back from storage.
    TestBed.resetTestingModule();
    const again = TestBed.inject(OwnEntriesService);
    expect(again.isOwn('a1')).toBeTrue();
    expect(again.isOwn('other')).toBeFalse();
    expect(again.isOwn(undefined)).toBeFalse();

    jasmine.clock().tick(7 * 24 * 60 * 60 * 1000);
    expect(again.isOwn('a1')).toBeFalse();
  });

  it('forgets a deleted entry and ignores broken storage', () => {
    const own = TestBed.inject(OwnEntriesService);
    own.add('a1');
    own.remove('a1');
    expect(own.isOwn('a1')).toBeFalse();

    localStorage.setItem('own_entries', 'not json');
    TestBed.resetTestingModule();
    expect(TestBed.inject(OwnEntriesService).isOwn('a1')).toBeFalse();
  });
});
