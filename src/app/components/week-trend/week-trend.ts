import { Component, computed, input, signal } from '@angular/core';
import { TrendPoint } from '../../utils/challenge-utils';

const W = 168;
const H = 40;
const PAD = 4; // room for the end dot and the 2px line at the edges
const DATE = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

/**
 * Stock-ticker style sparkline of the group's rolling 7-day km. Starts at 0 (area chart),
 * marks the latest value, and shows the value of any day on hover / touch.
 */
@Component({
  selector: 'app-week-trend',
  templateUrl: './week-trend.html',
  styleUrl: './week-trend.scss',
})
export class WeekTrend {
  readonly points = input<TrendPoint[]>([]);
  readonly unit = input('');

  readonly width = W;
  readonly height = H;
  /** Index of the hovered day, or null. */
  readonly hovered = signal<number | null>(null);

  private readonly coords = computed(() => {
    const pts = this.points();
    const max = Math.max(1, ...pts.map((p) => p.value));
    const step = pts.length > 1 ? (W - 2 * PAD) / (pts.length - 1) : 0;
    return pts.map((p, i) => ({ x: PAD + i * step, y: H - PAD - (p.value / max) * (H - 2 * PAD) }));
  });

  readonly linePath = computed(() =>
    this.coords()
      .map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' '),
  );
  readonly areaPath = computed(() => {
    const c = this.coords();
    if (!c.length) return '';
    const base = H - PAD;
    return `${this.linePath()} L${c[c.length - 1].x.toFixed(1)},${base} L${c[0].x.toFixed(1)},${base} Z`;
  });

  /** The point to mark: the hovered one, else the latest. */
  readonly marker = computed(() => {
    const c = this.coords();
    if (!c.length) return null;
    const i = this.hovered() ?? c.length - 1;
    return { ...c[i], point: this.points()[i], hovering: this.hovered() !== null };
  });

  readonly readout = computed(() => {
    const m = this.marker();
    if (!m) return '';
    const label = m.hovering ? `7 Tage bis ${DATE.format(m.point.date)}` : 'Letzte 7 Tage';
    return `${label}: ${m.point.value} ${this.unit()}`;
  });

  readonly ariaLabel = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const weeks = Math.round(pts.length / 7);
    return `Gemeinsame ${this.unit()} der jeweils letzten 7 Tage über ${weeks} Wochen: von ${pts[0].value} auf ${pts[pts.length - 1].value} ${this.unit()}`;
  });

  onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const n = this.points().length;
    if (!rect.width || n < 2) return;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD) / (W - 2 * PAD)) * (n - 1));
    this.hovered.set(Math.max(0, Math.min(n - 1, i)));
  }
}
