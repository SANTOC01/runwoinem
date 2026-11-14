import { AppEvent } from '../models/app-event';
import { DISTANCE_BADGES } from './challenge-utils';

export type FilterType = 'Alle' | 'Marathon' | 'Halbmarathon' | '10KM' | '5KM' | 'Trail';

/** The concrete race categories an event distance can fall into. */
export type DistanceCategory = Exclude<FilterType, 'Alle'>;

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

/** A custom distance written like "(3,7)" or "(3.7)", in km. Null if there is none. */
export function customDistanceKm(dist: string): { km: number; label: string } | null {
  const match = dist.match(/\((\d+)[,.](\d+)\)/);
  return match ? { km: parseFloat(`${match[1]}.${match[2]}`), label: `${match[1]},${match[2]} KM` } : null;
}

/** Standalone numbers in a text: "5km" gives 5, "42,2 km" gives 42.2, "15" is 15 (not 5), "2,5" is 2.5. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/(?<![\d.,])(\d+(?:[.,]\d+)?)(?!\d)/g)].map((m) => parseFloat(m[1].replace(',', '.')));
}

/** Whether any number lies in [min, max + 1): fuzzy, so 44.5 still counts for 42–44. */
function anyInRange(numbers: number[], min: number, max: number): boolean {
  return numbers.some((n) => n >= min && n < max + 1);
}

/**
 * The single race category of an event distance (null if it fits none, e.g. 3.7 km).
 * Used by both the filter and the badge, so they can never disagree.
 * Priority: trail, custom "(km)" distance, then emoji / keyword / number hints.
 */
export function classifyDistance(dist: string): DistanceCategory | null {
  const lower = dist.toLowerCase();
  if (dist.includes('🌄') || lower.includes('trail')) return 'Trail';

  const custom = customDistanceKm(dist);
  if (custom) {
    if (custom.km >= 42) return 'Marathon';
    if (custom.km >= 21) return 'Halbmarathon';
    if (custom.km >= 10) return '10KM';
    if (custom.km >= 5) return '5KM';
    return null;
  }

  // Half and full marathon are fuzzy (same ranges as the personal badges): 21–23 and 42–44 km.
  const numbers = numbersIn(lower);
  const { half, marathon } = DISTANCE_BADGES;
  // Half marathon first: "Halbmarathon" must not count as a marathon.
  if (dist.includes('🔴') || /halb|half/.test(lower) || anyInRange(numbers, half.min, half.max)) return 'Halbmarathon';
  if (dist.includes('⚫') || /\bmarathon\b/.test(lower) || anyInRange(numbers, marathon.min, marathon.max))
    return 'Marathon';
  if (dist.includes('🟡') || anyInRange(numbers, 10, 10)) return '10KM';
  if (dist.includes('🟢') || anyInRange(numbers, 5, 5)) return '5KM';
  return null;
}

export function matchesFilter(event: AppEvent, filter: FilterType): boolean {
  return filter === 'Alle' || classifyDistance(event.dist) === filter;
}
