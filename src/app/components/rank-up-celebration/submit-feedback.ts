import { inject, signal } from '@angular/core';
import { NextTarget, RankUp, RecordHit, RouteProgress, SubmitResult } from '../../interfaces/challenge.interface';
import { ToastService } from '../../services/toast-service';

/** A submit result big enough for the popup: a rank-up and/or reaching a new stop on the route. */
export type Celebration = SubmitResult;

export function recordText(hit: RecordHit, unit: string): string {
  switch (hit.kind) {
    case 'longest':
      return `🏅 Neuer Rekord: längster Lauf mit ${hit.value} ${unit}!`;
    case 'bestWeek':
      return `📅 Neue Bestwoche: ${hit.value} ${unit}!`;
    case 'milestone':
      return `🎯 ${hit.value} ${unit} insgesamt geknackt!`;
    case 'beatLastWeek':
      return `📈 Schon mehr als letzte Woche (${hit.value} ${unit})!`;
  }
}

export function routeText(route: RouteProgress, unit: string): string {
  return `🗺️ +${route.added} ${unit} für den Eurotrip – noch ${route.remaining} ${unit} bis ${route.name}`;
}

export function targetText(target: NextTarget, unit: string): string {
  return `👀 Noch ${target.needed} ${unit} bis Platz ${target.place} (${target.name})`;
}

/**
 * Page-side state for the feedback after logging an entry. A rank-up or a reached
 * route stop opens the celebration popup; once it closes, a climbing row is animated
 * in the ranking table.
 * Anything else (records, route progress, next target) is shown as a single toast. Create it as a
 * field of a component (it injects the ToastService).
 */
export class SubmitFeedback {
  private readonly toast = inject(ToastService);

  readonly celebrating = signal<Celebration | null>(null);
  readonly highlighted = signal<RankUp | null>(null);

  /** `extra` is an additional toast line (e.g. a boost notice) that is always shown. */
  show(result: SubmitResult | null, unit: string, extra?: string): void {
    if (!result) return;

    const messages: string[] = [];
    if (result.rankUp || result.arrival) {
      this.celebrating.set(result);
    } else {
      messages.push(...result.records.map((r) => recordText(r, unit)));
      if (result.route && result.route.added > 0) messages.push(routeText(result.route, unit));
      if (result.nextTarget) messages.push(targetText(result.nextTarget, unit));
    }
    if (extra) messages.push(extra);
    if (messages.length) this.toast.show(messages.join(' · '), 4500);
  }

  dismiss(): void {
    this.highlighted.set(this.celebrating()?.rankUp ?? null);
    this.celebrating.set(null);
  }

  reset(): void {
    this.celebrating.set(null);
    this.highlighted.set(null);
  }
}
