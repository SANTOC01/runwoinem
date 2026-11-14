import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

/** Closes the bubble that is currently open, so only one is ever visible. */
let closeActive: (() => void) | null = null;

/**
 * A hint that also works without a mouse: tap (or Enter / Space) shows a small bubble next to the
 * element, a tap elsewhere, scrolling or a few seconds hide it. The native `title` is kept for
 * mouse users, who get the browser's hover tooltip.
 *
 * Usage: `<span appTip="Läufer der Woche">⭐</span>`. Don't put it on elements that already do
 * something on click (buttons, links).
 */
@Directive({
  selector: '[appTip]',
  host: {
    class: 'tip-host',
    tabindex: '0',
    '[attr.title]': 'appTip()',
    '(click)': 'toggle()',
    '(keydown.enter)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
    '(keydown.escape)': 'hide()',
    '(blur)': 'hide()',
  },
})
export class Tip implements OnDestroy {
  readonly appTip = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private bubble: HTMLElement | null = null;
  private timer?: ReturnType<typeof setTimeout>;

  private readonly onOutsidePointer = (event: Event) => {
    if (!this.host.contains(event.target as Node)) this.hide();
  };
  private readonly onViewportChange = () => this.hide();

  onSpace(event: Event) {
    event.preventDefault(); // no page scroll
    this.toggle();
  }

  toggle() {
    if (this.bubble) this.hide();
    else this.show();
  }

  hide() {
    clearTimeout(this.timer);
    this.bubble?.remove();
    this.bubble = null;
    document.removeEventListener('pointerdown', this.onOutsidePointer, true);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    if (closeActive === this.hideRef) closeActive = null;
  }

  ngOnDestroy() {
    this.hide();
  }

  private readonly hideRef = () => this.hide();

  private show() {
    const text = this.appTip();
    if (!text) return;
    closeActive?.();
    closeActive = this.hideRef;

    const bubble = document.createElement('div');
    bubble.className = 'tip-bubble';
    bubble.setAttribute('role', 'tooltip');
    bubble.textContent = text;
    document.body.appendChild(bubble);
    this.bubble = bubble;
    this.place(bubble);

    document.addEventListener('pointerdown', this.onOutsidePointer, true);
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
    // Longer texts stay a little longer.
    this.timer = setTimeout(() => this.hide(), Math.max(3000, 1500 + text.length * 60));
  }

  /** Above the element, centred and kept inside the screen; below it if there is no room above. */
  private place(bubble: HTMLElement) {
    const margin = 8;
    const anchor = this.host.getBoundingClientRect();
    const size = bubble.getBoundingClientRect();
    const left = anchor.left + anchor.width / 2 - size.width / 2;
    const clamped = Math.max(margin, Math.min(left, window.innerWidth - size.width - margin));
    let top = anchor.top - size.height - margin;
    if (top < margin) top = anchor.bottom + margin;
    bubble.style.left = `${clamped}px`;
    bubble.style.top = `${top}px`;
  }
}
