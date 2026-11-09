import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { RankUp } from '../../interfaces/challenge.interface';

/**
 * Page-side state for a rank-up: first the celebration overlay, then (after it
 * closes) the climbing row in the ranking table.
 */
export class RankUpState {
  readonly celebrating = signal<RankUp | null>(null);
  readonly highlighted = signal<RankUp | null>(null);

  show(rankUp: RankUp | null): void {
    if (rankUp) this.celebrating.set(rankUp);
  }

  dismiss(): void {
    this.highlighted.set(this.celebrating());
    this.celebrating.set(null);
  }

  reset(): void {
    this.celebrating.set(null);
    this.highlighted.set(null);
  }
}

const AUTO_CLOSE_MS = 5000;
const CONFETTI = ['🎉', '✨', '🏃', '💪', '🔥', '⭐'];
const MAX_NAMES = 3;

/** Full-screen "you climbed the ranking" celebration. Shows while `rankUp` is set. */
@Component({
  selector: 'app-rank-up-celebration',
  templateUrl: './rank-up-celebration.html',
  styleUrl: './rank-up-celebration.scss',
})
export class RankUpCelebration {
  readonly rankUp = input.required<RankUp>();
  readonly closed = output<void>();

  readonly firstName = computed(() => this.rankUp().name.split(' ')[0]);
  readonly places = computed(() => {
    const { from, to } = this.rankUp();
    return from === null ? null : from - to;
  });
  readonly headline = computed(() => {
    const { to } = this.rankUp();
    if (to === 1) return `${this.firstName()}, du bist an der Spitze! 👑`;
    if (to <= 3) return `Podest, ${this.firstName()}! 🥳`;
    return `Stark, ${this.firstName()}! 🚀`;
  });
  readonly overtakenText = computed(() => {
    const names = this.rankUp().overtaken;
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
      this.rankUp(); // restart the timer if a new rank-up comes in
      clearTimeout(timer);
      timer = setTimeout(() => this.closed.emit(), AUTO_CLOSE_MS);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
