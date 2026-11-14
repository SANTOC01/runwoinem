import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { SaveState } from '../../interfaces/challenge.interface';

type Phase = 'hidden' | 'running' | 'done';

/** How long the "✅ Eingetragen!" state stays before the overlay is gone (matches the scss fade). */
const DONE_MS = 900;
/** Messages shown while waiting, by delay in ms (the backend can take a few seconds). */
const MESSAGES: [number, string][] = [
  [0, 'Dein Lauf wird eingetragen…'],
  [2500, 'Fast geschafft…'],
  [6000, 'Die Tabelle schnauft noch – gleich! 😅'],
];

/**
 * Full-screen "saving…" overlay while a new entry is sent to the backend, so nobody
 * leaves before the result (rank-up, records, …) is shown. Ends with a short ✅, then
 * reveals whatever comes next. Driven by the challenge service's `saveState`.
 */
@Component({
  selector: 'app-submit-progress',
  templateUrl: './submit-progress.html',
  styleUrl: './submit-progress.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class SubmitProgress {
  readonly state = input<SaveState>('idle');

  readonly phase = signal<Phase>('hidden');
  readonly message = signal(MESSAGES[0][1]);
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      const state = this.state();
      untracked(() => this.onState(state));
    });
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  private onState(state: SaveState): void {
    this.clearTimers();
    if (state === 'saving') {
      this.phase.set('running');
      for (const [delay, text] of MESSAGES) this.timers.push(setTimeout(() => this.message.set(text), delay));
    } else if (state === 'done' && this.phase() === 'running') {
      this.phase.set('done');
      this.timers.push(setTimeout(() => this.phase.set('hidden'), DONE_MS));
    } else {
      // Errors are reported by a toast; a stale 'done' (e.g. after navigating back) shows nothing.
      this.phase.set('hidden');
    }
  }

  /** Ask before closing the tab while the entry is still on its way. */
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.phase() === 'running') event.preventDefault();
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
