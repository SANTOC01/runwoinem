import { AppEvent } from '../models/app-event';

export type FilterType = 'Alle' | 'Marathon' | 'Halbmarathon' | '10KM' | '5KM' | 'Trail';

/** Formats "dd.mm.yyyy" or ISO ("yyyy-mm-dd…") as a long German date; returns the input if unparsable. */
export function formatEventDate(dateString: string): string {
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

/** Distance text without the Bergstraßen-Cup marker. */
export function distText(dist: string): string {
  return dist.replace('⛰️', '').trim();
}

const FILTER_EMOJI: Record<FilterType, string> = {
  Alle: '',
  Marathon: '⚫',
  Halbmarathon: '🔴',
  '10KM': '🟡',
  '5KM': '🟢',
  Trail: '🌄',
};

const FILTER_KEYWORDS: Record<FilterType, string[]> = {
  Alle: [],
  Marathon: ['42', 'marathon'],
  Halbmarathon: ['21', 'halb', 'half'],
  '10KM': ['10km', '10 km'],
  '5KM': ['5km', '5 km'],
  Trail: ['trail'],
};

export function matchesFilter(event: AppEvent, filter: FilterType): boolean {
  if (filter === 'Alle') return true;
  if (event.dist.includes(FILTER_EMOJI[filter])) return true;
  const dist = event.dist.toLowerCase();
  return FILTER_KEYWORDS[filter].some((keyword) => dist.includes(keyword));
}
