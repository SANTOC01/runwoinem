import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { EventsService } from '../../services/events-service';
import { AppEvent } from '../../models/app-event';
import { EventsModalComponent } from '../../components/events-modal/events-modal';
import { RevealOnScroll } from '../../directives/reveal-on-scroll';
import { FilterType, distText, formatEventDate, matchesFilter } from '../../utils/event-utils';

const FILTER_EMOJI: Record<FilterType, string> = {
  'Alle': '🗓️', 'Marathon': '⚫', 'Halbmarathon': '🔴', '10KM': '🟡', '5KM': '🟢', 'Trail': '🌄'
};

const FILTER_COLOR: Record<FilterType, string> = {
  'Alle': '#43c6ac', 'Marathon': '#2c3e50', 'Halbmarathon': '#e74c3c',
  '10KM': '#f39c12', '5KM': '#27ae60', 'Trail': '#a15b00'
};

@Component({
  selector: 'app-events-page',
  imports: [RouterModule, EventsModalComponent, RevealOnScroll],
  templateUrl: './events-page.html',
  styleUrls: ['./events-page.scss']
})
export class EventsPage {
  private readonly eventsService = inject(EventsService);

  readonly filters: FilterType[] = ['Alle', 'Marathon', 'Halbmarathon', '10KM', '5KM', 'Trail'];
  readonly formatDate = formatEventDate;
  readonly getDistText = distText;

  readonly selectedFilter = signal<FilterType>('Alle');
  readonly selectedEvent = signal<AppEvent | null>(null);

  readonly events = toSignal(
    this.eventsService.events$.pipe(map(events => [...events].sort((a, b) => a.daysLeft - b.daysLeft))),
    { initialValue: [] as AppEvent[] }
  );

  readonly upcomingEvents = computed(() =>
    this.events().filter(e => e.daysLeft >= 0 && matchesFilter(e, this.selectedFilter()))
  );

  readonly totalParticipants = computed(() =>
    this.events().reduce((sum, e) => sum + (e.participants?.length ?? 0), 0)
  );

  // Past events are loaded lazily per year when a year is expanded.
  readonly pastYearCounts = signal<Record<string, number>>({});
  readonly pastYearsAscending = computed(() =>
    Object.keys(this.pastYearCounts()).map(Number).sort((a, b) => a - b)
  );
  private readonly pastEventsByYear = signal<ReadonlyMap<number, AppEvent[]>>(new Map());
  private readonly expandedYears = signal<ReadonlySet<number>>(new Set());
  private readonly loadingYears = signal<ReadonlySet<number>>(new Set());

  constructor() {
    this.eventsService.loadEvents();
    this.eventsService.loadPastYears().then(years => this.pastYearCounts.set(years));
  }

  filterEvents(filter: FilterType) {
    this.selectedFilter.set(filter);
  }

  async toggleYear(year: number) {
    if (this.expandedYears().has(year)) {
      this.expandedYears.update(years => without(years, year));
      return;
    }

    if (!this.pastEventsByYear().has(year)) {
      this.loadingYears.update(years => new Set(years).add(year));
      const events = await this.eventsService.loadPastEvents(year);
      this.pastEventsByYear.update(map => new Map(map).set(year, events));
      this.loadingYears.update(years => without(years, year));
    }

    this.expandedYears.update(years => new Set(years).add(year));
  }

  isYearLoading(year: number): boolean {
    return this.loadingYears().has(year);
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears().has(year);
  }

  isYearDividerVisible(year: number): boolean {
    const sorted = this.pastYearsAscending();
    const idx = sorted.indexOf(year);
    if (idx === -1) return false;
    // Most recent year is always visible
    if (idx === sorted.length - 1) return true;
    // Older years appear only when the next more recent year is expanded
    return this.expandedYears().has(sorted[idx + 1]);
  }

  getPastEventsForYear(year: number): AppEvent[] {
    const filter = this.selectedFilter();
    return (this.pastEventsByYear().get(year) ?? []).filter(e => matchesFilter(e, filter));
  }

  // Ordered highest → lowest priority
  private readonly distanceTiers = [
    { match: (s: string) => s.includes('🌄') || s.toLowerCase().includes('trail'),                          color: '#a15b00' },
    { match: (s: string) => s.includes('⚫') || /\b42\b/.test(s) || /\bmarathon\b/i.test(s),               color: '#2c3e50', label: 'Marathon' },
    { match: (s: string) => s.includes('🔴') || /\b21\b/.test(s) || /halb|half/i.test(s),                  color: '#e74c3c', label: 'Halbmarathon' },
    { match: (s: string) => s.includes('🟡') || /\b10\b/.test(s),                                           color: '#f39c12', label: '10KM' },
    { match: (s: string) => s.includes('🟢') || /\b5\b/.test(s),                                            color: '#27ae60', label: '5KM' },
  ];

  getDistanceBadge(dist: string): { color: string; label: string } {
    for (const tier of this.distanceTiers) {
      if (tier.match(dist)) return { color: tier.color, label: tier.label ?? 'Trail' };
    }

    // Custom distance: parse "(3,7)" or "(3.7)" → 3.7 km
    const custom = dist.match(/\((\d+)[,.](\d+)\)/);
    if (custom) {
      const km = parseFloat(`${custom[1]}.${custom[2]}`);
      const label = `${custom[1]},${custom[2]} KM`;
      if (km >= 42) return { color: '#2c3e50', label };
      if (km >= 21) return { color: '#e74c3c', label };
      if (km >= 10) return { color: '#f39c12', label };
      if (km >= 5)  return { color: '#27ae60', label };
      return { color: '#43c6ac', label };
    }

    return { color: '#43c6ac', label: distText(dist) };
  }

  getFilterEmoji(filter: FilterType): string {
    return FILTER_EMOJI[filter];
  }

  getFilterColor(filter: FilterType): string {
    return FILTER_COLOR[filter];
  }

  isNextUp(event: AppEvent): boolean {
    return this.upcomingEvents()[0] === event;
  }

  getDaysLabel(daysLeft: number): string {
    if (daysLeft === 0) return 'Heute!';
    if (daysLeft === 1) return 'Morgen!';
    if (daysLeft > 0) return `in ${daysLeft} Tagen`;
    return `vor ${Math.abs(daysLeft)} Tagen`;
  }

  getVisibleParticipants(event: AppEvent): string[] {
    return (event.participants ?? []).slice(0, 3);
  }

  getExtraParticipants(event: AppEvent): number {
    return Math.max(0, (event.participants?.length ?? 0) - 3);
  }

  openEventModal(event: AppEvent) {
    this.selectedEvent.set(event);
  }

  closeEventModal() {
    this.selectedEvent.set(null);
  }

  isBergstrassenCup(dist: string): boolean {
    return dist.includes('⛰️');
  }
}

function without<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  next.delete(value);
  return next;
}
