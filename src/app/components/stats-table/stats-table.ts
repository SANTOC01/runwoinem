import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest, map } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';

interface DataRow {
  name: string;
  hohenmeter: number;
  date: string;
}

@Component({
  selector: 'app-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-table.html',
  styleUrls: ['./stats-table.scss']
})
export class StatsTable implements OnInit, OnDestroy {
  entries: DataRow[] = [];
  private subscription: Subscription | null = null;

  constructor(private challengeService: ChallengeService) {}

  ngOnInit() {
    this.subscription = combineLatest([
      this.challengeService.entries$
    ]).pipe(
      map(([entries]) => {
        // Sort entries by date in descending order
        return entries.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      })
    ).subscribe({
      next: (sortedEntries) => {
        this.entries = sortedEntries;
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  async deleteEntry(entry: DataRow) {
    try {
      await this.challengeService.deleteData(entry);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }
}
