import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';
import { AppEvent } from '../../models/app-event';
import { EventsModalComponent } from '../../components/events-modal/events-modal';

type FilterType = 'Alle' | 'Marathon' | 'Halbmarathon' | '10KM' | '5KM' | 'Trail';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EventsModalComponent],
  templateUrl: './events-page.html',
  styleUrls: ['./events-page.scss']
})
export class EventsPage implements OnInit, AfterViewInit, OnDestroy {
  events: AppEvent[] = [];
  upcomingEvents: AppEvent[] = [];
  pastEventsByYear = new Map<number, AppEvent[]>();
  pastYears: number[] = [];
  pastYearCounts: Record<string, number> = {};
  expandedYears = new Set<number>();
  loadingYears = new Set<number>();
  selectedFilter: FilterType = 'Alle';
  selectedEvent: AppEvent | null = null;

  readonly filters: FilterType[] = ['Alle', 'Marathon', 'Halbmarathon', '10KM', '5KM', 'Trail'];

  private subscription: Subscription | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(public readonly challengeService: ChallengeService) {}

  ngOnInit() {
    this.challengeService.loadEvents();
    this.subscription = this.challengeService.events$.subscribe(events => {
      this.events = [...events].sort((a, b) => a.daysLeft - b.daysLeft);
      this.applyFilter();
    });
    this.loadPastYears();
  }

  private async loadPastYears() {
    this.pastYearCounts = await this.challengeService.loadPastYears();
    this.pastYears = Object.keys(this.pastYearCounts)
      .map(Number)
      .sort((a, b) => b - a);
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.observer?.disconnect();
  }

  filterEvents(filter: FilterType) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  private applyFilter() {
    let filtered = this.events;

    if (this.selectedFilter !== 'Alle') {
      const emojiMap: Record<FilterType, string> = {
        'Alle': '', 'Marathon': '⚫', 'Halbmarathon': '🔴',
        '10KM': '🟡', '5KM': '🟢', 'Trail': '🌄'
      };
      const textMap: Record<FilterType, string[]> = {
        'Alle': [], 'Marathon': ['42', 'marathon'], 'Halbmarathon': ['21', 'halb', 'half'],
        '10KM': ['10km', '10 km'], '5KM': ['5km', '5 km'], 'Trail': ['trail']
      };
      const emoji = emojiMap[this.selectedFilter];
      const keywords = textMap[this.selectedFilter];
      filtered = this.events.filter(e => {
        if (e.dist.includes(emoji)) return true;
        const d = e.dist.toLowerCase();
        return keywords.some(k => d.includes(k));
      });
    }

    this.upcomingEvents = filtered
      .filter(e => e.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    setTimeout(() => this.observeCards(), 100);
  }

  async toggleYear(year: number) {
    if (this.expandedYears.has(year)) {
      this.expandedYears.delete(year);
      return;
    }

    // Fetch from API if not already loaded
    if (!this.pastEventsByYear.has(year)) {
      this.loadingYears.add(year);
      const events = await this.challengeService.loadPastEvents(year);
      this.pastEventsByYear.set(year, events);
      this.loadingYears.delete(year);
    }

    this.expandedYears.add(year);
    setTimeout(() => this.observeCards(), 100);
  }

  isYearLoading(year: number): boolean {
    return this.loadingYears.has(year);
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears.has(year);
  }

  get pastYearsAscending(): number[] {
    return [...this.pastYears].sort((a, b) => a - b);
  }

  isYearDividerVisible(year: number): boolean {
    const sorted = this.pastYearsAscending;
    const idx = sorted.indexOf(year);
    if (idx === -1) return false;
    // Most recent year is always visible
    if (idx === sorted.length - 1) return true;
    // Older years appear only when the next more recent year is expanded
    return this.expandedYears.has(sorted[idx + 1]);
  }

  getPastEventsForYear(year: number): AppEvent[] {
    const events = this.pastEventsByYear.get(year) ?? [];
    if (this.selectedFilter === 'Alle') return events;

    const emojiMap: Record<FilterType, string> = {
      'Alle': '', 'Marathon': '⚫', 'Halbmarathon': '🔴',
      '10KM': '🟡', '5KM': '🟢', 'Trail': '🌄'
    };
    const textMap: Record<FilterType, string[]> = {
      'Alle': [], 'Marathon': ['42', 'marathon'], 'Halbmarathon': ['21', 'halb', 'half'],
      '10KM': ['10km', '10 km'], '5KM': ['5km', '5 km'], 'Trail': ['trail']
    };
    const emoji = emojiMap[this.selectedFilter];
    const keywords = textMap[this.selectedFilter];
    return events.filter(e => {
      if (e.dist.includes(emoji)) return true;
      const d = e.dist.toLowerCase();
      return keywords.some(k => d.includes(k));
    });
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    this.observeCards();
  }

  private observeCards() {
    document.querySelectorAll('.timeline-card').forEach(card => {
      this.observer?.observe(card);
    });
  }

  // Ordered highest → lowest priority
  private readonly distanceTiers = [
    { match: (s: string) => s.includes('🌄') || s.toLowerCase().includes('trail'),                                         color: '#a15b00', label: 'Trail' },
    { match: (s: string) => s.includes('⚫') || /\b42\b/.test(s) || /\bmarathon\b/i.test(s),                              color: '#2c3e50', label: 'Marathon' },
    { match: (s: string) => s.includes('🔴') || /\b21\b/.test(s) || /halb|half/i.test(s),                                 color: '#e74c3c', label: 'Halbmarathon' },
    { match: (s: string) => s.includes('🟡') || /\b10\b/.test(s),                                                          color: '#f39c12', label: '10KM' },
    { match: (s: string) => s.includes('🟢') || /\b5\b/.test(s),                                                           color: '#27ae60', label: '5KM' },
  ];

  getDistanceBadge(dist: string): { color: string; label: string } {
    for (const tier of this.distanceTiers) {
      if (tier.match(dist)) return { color: tier.color, label: tier.label };
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

    return { color: '#43c6ac', label: dist.replace('⛰️', '').trim() };
  }

  getFilterEmoji(filter: FilterType): string {
    const map: Record<FilterType, string> = {
      'Alle': '🗓️',
      'Marathon': '⚫',
      'Halbmarathon': '🔴',
      '10KM': '🟡',
      '5KM': '🟢',
      'Trail': '🌄'
    };
    return map[filter];
  }

  getFilterColor(filter: FilterType): string {
    const map: Record<FilterType, string> = {
      'Alle': '#43c6ac',
      'Marathon': '#2c3e50',
      'Halbmarathon': '#e74c3c',
      '10KM': '#f39c12',
      '5KM': '#27ae60',
      'Trail': '#a15b00'
    };
    return map[filter];
  }

  isNextUp(event: AppEvent): boolean {
    return this.upcomingEvents.length > 0 && this.upcomingEvents[0] === event;
  }

  isPast(event: AppEvent): boolean {
    return event.daysLeft < 0;
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

  get totalParticipants(): number {
    return this.events.reduce((sum, e) => sum + (e.participants?.length ?? 0), 0);
  }

  openEventModal(event: AppEvent) {
    this.selectedEvent = event;
  }

  closeEventModal() {
    this.selectedEvent = null;
  }

  isBergstrassenCup(dist: string): boolean {
    return dist.includes('⛰️');
  }

  getDistText(dist: string): string {
    return dist.replace('⛰️', '').trim();
  }

  formatDate(dateString: string): string {
    let year: number, month: number, day: number;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString.trim())) {
      [day, month, year] = dateString.trim().split('.').map(Number);
    } else {
      [year, month, day] = dateString.substring(0, 10).split('-').map(Number);
    }
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
