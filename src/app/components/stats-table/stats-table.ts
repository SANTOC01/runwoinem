import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeEntry } from '../../interfaces/challenge.interface';

interface Row {
  entry: ChallengeEntry;
  boosted: boolean;
  dateLabel: string;
}

const PAGE_SIZE = 30;
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
});

@Component({
  selector: 'app-stats-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-table.html',
  styleUrls: ['./stats-table.scss']
})
export class StatsTable implements OnChanges {
  @Input() entries: ChallengeEntry[] = [];
  @Input() unit = '';
  /** Optional: marks entries that count extra for the shared total. */
  @Input() isBoosted?: (e: ChallengeEntry) => boolean;
  @Input() boostFootnote = '';
  @Output() deleteRequested = new EventEmitter<ChallengeEntry>();

  visibleCount = PAGE_SIZE;
  rows: Row[] = [];
  hasBoosted = false;

  get hasMore(): boolean {
    return this.entries.length > this.visibleCount;
  }

  get remaining(): number {
    return this.entries.length - this.visibleCount;
  }

  ngOnChanges(): void {
    this.rebuild();
  }

  showMore(): void {
    this.visibleCount += PAGE_SIZE;
    this.rebuild();
  }

  private rebuild(): void {
    const fn = this.isBoosted;
    this.rows = this.entries.slice(0, this.visibleCount).map(entry => ({
      entry,
      boosted: !!fn && fn(entry),
      dateLabel: DATE_FORMAT.format(new Date(entry.date)),
    }));
    this.hasBoosted = !!fn && this.entries.some(e => fn(e));
  }

  deleteEntry(entry: ChallengeEntry) {
    this.deleteRequested.emit(entry);
  }
}
