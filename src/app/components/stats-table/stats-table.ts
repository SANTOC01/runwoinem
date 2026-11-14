import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Tip } from '../../directives/tip';
import { ChallengeEntry } from '../../interfaces/challenge.interface';

const PAGE_SIZE = 30;
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

@Component({
  selector: 'app-stats-table',
  imports: [Tip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-table.html',
  styleUrls: ['./stats-table.scss'],
})
export class StatsTable {
  readonly entries = input<ChallengeEntry[]>([]);
  readonly unit = input('');
  /** Optional: marks entries that count extra for the shared total. */
  readonly isBoosted = input<((e: ChallengeEntry) => boolean) | undefined>();
  readonly boostFootnote = input('');
  readonly deleteRequested = output<ChallengeEntry>();

  private readonly visibleCount = signal(PAGE_SIZE);

  readonly rows = computed(() => {
    const boosted = this.isBoosted();
    return this.entries()
      .slice(0, this.visibleCount())
      .map((entry) => ({
        entry,
        boosted: !!boosted && boosted(entry),
        dateLabel: DATE_FORMAT.format(new Date(entry.date)),
      }));
  });
  readonly hasBoosted = computed(() => {
    const boosted = this.isBoosted();
    return !!boosted && this.entries().some(boosted);
  });
  readonly remaining = computed(() => this.entries().length - this.visibleCount());
  readonly hasMore = computed(() => this.remaining() > 0);

  showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }
}
