import { Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { Arrival, NextTarget, RankUp, RecordHit } from '../../interfaces/challenge.interface';
import { recordText, targetText } from './submit-feedback';

const AUTO_CLOSE_MS = 6500;
const CONFETTI = ['🎉', '✨', '🏃', '💪', '🔥', '⭐'];
const MAX_NAMES = 3;

/**
 * Full-screen celebration after an entry that climbed the ranking (`rankUp`) and/or
 * brought the group to a new stop on the route (`arrival`). Give it at least one of both.
 */
@Component({
  selector: 'app-rank-up-celebration',
  templateUrl: './rank-up-celebration.html',
  styleUrl: './rank-up-celebration.scss',
})
export class RankUpCelebration {
  readonly rankUp = input<RankUp | null>(null);
  readonly arrival = input<Arrival | null>(null);
  /** Who logged the entry (used for the headline when there is no rank-up). */
  readonly name = input('');
  /** Personal bests hit by the same entry, shown below the places. */
  readonly records = input<RecordHit[]>([]);
  /** Next place to aim for (null when already first). */
  readonly target = input<NextTarget | null>(null);
  readonly unit = input('');
  readonly closed = output<void>();

  readonly recordTexts = computed(() => this.records().map((r) => recordText(r, this.unit())));
  readonly targetLabel = computed(() => {
    const target = this.target();
    return target ? targetText(target, this.unit()) : '';
  });

  readonly firstName = computed(() => (this.rankUp()?.name ?? this.name()).split(' ')[0]);
  readonly places = computed(() => {
    const up = this.rankUp();
    return !up || up.from === null ? null : up.from - up.to;
  });
  readonly headline = computed(() => {
    const arrival = this.arrival();
    if (arrival?.finish) return `${arrival.emoji} Eurotrip geschafft!`;
    if (arrival) return `${arrival.emoji} ${arrival.name} erreicht!`;
    const to = this.rankUp()?.to ?? 0;
    if (to === 1) return `${this.firstName()}, du bist an der Spitze! 👑`;
    if (to <= 3) return `Podest, ${this.firstName()}! 🥳`;
    return `Stark, ${this.firstName()}! 🚀`;
  });
  readonly arrivalText = computed(() => {
    const arrival = this.arrival();
    if (!arrival) return '';
    const who = this.firstName() ? `${this.firstName()}, dein` : 'Dein';
    return arrival.finish
      ? `${who} Lauf hat uns zurück nach ${arrival.name} gebracht – einmal quer durch Europa! 🌍`
      : `${who} Lauf hat die Gruppe nach ${arrival.name} gebracht!`;
  });
  readonly overtakenText = computed(() => {
    const names = this.rankUp()?.overtaken ?? [];
    if (names.length <= MAX_NAMES) return names.join(', ');
    return `${names.slice(0, MAX_NAMES).join(', ')} und ${names.length - MAX_NAMES} weitere`;
  });

  /** Pre-computed so the pieces don't change on every change detection run. */
  readonly confetti = Array.from({ length: 28 }, (_, i) => ({
    emoji: CONFETTI[i % CONFETTI.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.6,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() - 0.5) * 720,
  }));

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      // Restart the timer if a new celebration comes in.
      this.rankUp();
      this.arrival();
      clearTimeout(timer);
      timer = setTimeout(() => this.closed.emit(), AUTO_CLOSE_MS);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
