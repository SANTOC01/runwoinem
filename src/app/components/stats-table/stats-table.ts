import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeEntry } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-table.html',
  styleUrls: ['./stats-table.scss']
})
export class StatsTable {
  @Input() entries: ChallengeEntry[] = [];
  @Input() unit = '';
  /** Optional: marks entries that count extra for the shared total. */
  @Input() isBoosted?: (e: ChallengeEntry) => boolean;
  @Input() boostFootnote = '';
  @Output() deleteRequested = new EventEmitter<ChallengeEntry>();

  get hasBoosted(): boolean {
    return !!this.isBoosted && this.entries.some(e => this.isBoosted!(e));
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  deleteEntry(entry: ChallengeEntry) {
    this.deleteRequested.emit(entry);
  }
}
