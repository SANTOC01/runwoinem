import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  EUROPE_ROUTE_WAYPOINTS,
  LAP_DISTANCE_KM,
  TOTAL_GOAL_KM,
  RouteWaypoint,
} from './europe-route.data';

interface SvgPoint { x: number; y: number; }
interface BezierSegment {
  p0: SvgPoint; cp1: SvgPoint; cp2: SvgPoint; p1: SvgPoint;
}

// Europe bounding box used for equirectangular projection
const LON_MIN = -25, LON_MAX = 45;
const LAT_MIN = 35,  LAT_MAX = 72;
const SVG_W = 900, SVG_H = 600;

function svgX(lon: number): number {
  return (lon - LON_MIN) / (LON_MAX - LON_MIN) * SVG_W;
}
function svgY(lat: number): number {
  return (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * SVG_H;
}

/** Evaluate cubic bezier at t */
function bezierAt(seg: BezierSegment, t: number): SvgPoint {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*seg.p0.x + 3*mt*mt*t*seg.cp1.x + 3*mt*t*t*seg.cp2.x + t*t*t*seg.p1.x,
    y: mt*mt*mt*seg.p0.y + 3*mt*mt*t*seg.cp1.y + 3*mt*t*t*seg.cp2.y + t*t*t*seg.p1.y,
  };
}

/** Build Catmull-Rom → Cubic Bezier segments for a closed loop of SVG points */
function buildSegments(pts: SvgPoint[]): BezierSegment[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const next2 = pts[(i + 2) % n];
    const p1 = pts[(i + 1) % n];
    return {
      p0: p,
      cp1: { x: p.x + (next.x - prev.x) / 6, y: p.y + (next.y - prev.y) / 6 },
      cp2: { x: p1.x - (next2.x - p.x) / 6,  y: p1.y - (next2.y - p.y) / 6 },
      p1,
    };
  });
}

/**
 * De Casteljau split: returns the first [0, t] portion of a cubic bezier
 * as a new segment with corrected control points.
 * This ensures the sub-curve lies exactly on the original curve.
 */
function splitBezierFirst(seg: BezierSegment, t: number): BezierSegment {
  const lerp = (a: SvgPoint, b: SvgPoint): SvgPoint => ({
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  });
  const q01  = lerp(seg.p0,  seg.cp1);  // level 1
  const q12  = lerp(seg.cp1, seg.cp2);  // level 1
  const q012 = lerp(q01, q12);          // level 2 → new cp2
  return {
    p0:  seg.p0,
    cp1: q01,
    cp2: q012,
    p1:  bezierAt(seg, t),
  };
}

/** Append a single segment's C command to an SVG path string */
function appendSeg(d: string, s: BezierSegment): string {
  return d + ` C ${s.cp1.x.toFixed(1)},${s.cp1.y.toFixed(1)} ${s.cp2.x.toFixed(1)},${s.cp2.y.toFixed(1)} ${s.p1.x.toFixed(1)},${s.p1.y.toFixed(1)}`;
}

interface WeatherInfo { temp: number; icon: string; city: string; }

@Component({
  selector: 'app-europe-map',
  templateUrl: './europe-map.html',
  styleUrl: './europe-map.scss',
})
export class EuropeMap {
  private readonly http = inject(HttpClient);

  readonly total = input(0);
  readonly bgImagePath = output<string>();

  readonly waypoints: RouteWaypoint[] = EUROPE_ROUTE_WAYPOINTS;
  readonly lapDistance = LAP_DISTANCE_KM;
  readonly totalGoal = TOTAL_GOAL_KM;
  readonly svgWidth = SVG_W;
  readonly svgHeight = SVG_H;
  // Cropped viewBox focused on the actual route area (lon≈-10..25, lat≈38..53)
  readonly routeViewBox = '185 235 480 357';

  // Precomputed SVG points and bezier segments (constant)
  readonly svgPoints: SvgPoint[] = EUROPE_ROUTE_WAYPOINTS.map(w => ({
    x: svgX(w.lon), y: svgY(w.lat),
  }));
  private readonly segments: BezierSegment[] = buildSegments(this.svgPoints);

  // Full route path (all segments, loop closed) – drawn once as dashed grey
  readonly fullRoutePath: string = (() => {
    let d = `M ${this.segments[0].p0.x.toFixed(1)},${this.segments[0].p0.y.toFixed(1)}`;
    for (const s of this.segments) d = appendSeg(d, s);
    return d + ' Z';
  })();

  /** Everything that depends on the current total. */
  private readonly position = computed(() => this.computePosition(Math.max(0, this.total())));
  readonly kmInLap = computed(() => this.position().kmInLap);
  readonly dotX = computed(() => this.position().dot.x);
  readonly dotY = computed(() => this.position().dot.y);
  readonly progressPath = computed(() => this.position().progressPath);
  readonly nearestCityName = computed(() => this.position().nextCityName);
  readonly kmToNextCity = computed(() => this.position().kmToNextCity);
  readonly totalKmFormatted = computed(() => this.total().toLocaleString('de-DE'));

  readonly weather = signal<WeatherInfo | null>(null);
  private lastWeatherCity = '';

  constructor() {
    // Side effects of the position: announce the city background and refresh the weather.
    effect(() => {
      const { lastWaypoint } = this.position();
      this.bgImagePath.emit(lastWaypoint.image ? `assets/images/locations/${lastWaypoint.image}` : '');
      if (lastWaypoint.name !== this.lastWeatherCity) {
        this.lastWeatherCity = lastWaypoint.name;
        this.fetchWeather(lastWaypoint);
      }
    });
  }

  private computePosition(total: number) {
    const kmInLap = Math.min(total, LAP_DISTANCE_KM);
    const wps = EUROPE_ROUTE_WAYPOINTS;

    // Find which segment we are in
    let segIdx = wps.length - 1; // default: last segment (back to start)
    for (let i = 0; i < wps.length - 1; i++) {
      if (kmInLap >= wps[i].cumulativeKm && kmInLap < wps[i + 1].cumulativeKm) {
        segIdx = i;
        break;
      }
    }
    // Handle the closing segment (Amsterdam → Weinheim)
    const closingSegStart = wps[wps.length - 1].cumulativeKm;
    const inClosingSegment = kmInLap >= closingSegStart;
    let t: number;
    if (inClosingSegment) {
      segIdx = wps.length - 1;
      t = (kmInLap - closingSegStart) / (LAP_DISTANCE_KM - closingSegStart);
    } else {
      const segStart = wps[segIdx].cumulativeKm;
      t = (kmInLap - segStart) / (wps[segIdx + 1].cumulativeKm - segStart);
    }
    t = Math.max(0, Math.min(1, t));

    // Progress path: all completed segments + de Casteljau split of the partial segment
    let progressPath = '';
    if (segIdx !== 0 || t !== 0) {
      progressPath = `M ${this.segments[0].p0.x.toFixed(1)},${this.segments[0].p0.y.toFixed(1)}`;
      for (let i = 0; i < segIdx; i++) progressPath = appendSeg(progressPath, this.segments[i]);
      if (t > 0) progressPath = appendSeg(progressPath, splitBezierFirst(this.segments[segIdx], t));
    }

    // Next city (the waypoint we are heading towards)
    const nextIdx = inClosingSegment ? 0 : segIdx + 1;
    const nextCityKm = inClosingSegment ? LAP_DISTANCE_KM : wps[nextIdx].cumulativeKm;

    return {
      kmInLap,
      dot: bezierAt(this.segments[segIdx], t),
      progressPath,
      nextCityName: wps[nextIdx].name,
      kmToNextCity: Math.round(nextCityKm - kmInLap),
      lastWaypoint: wps[segIdx],
    };
  }

  /** For the template: get SVG x for a waypoint */
  wpX(wp: RouteWaypoint): number { return svgX(wp.lon); }
  /** For the template: get SVG y for a waypoint */
  wpY(wp: RouteWaypoint): number { return svgY(wp.lat); }

  /** Whether a waypoint has already been passed in the current lap */
  isPassed(wp: RouteWaypoint): boolean {
    return this.kmInLap() > wp.cumulativeKm;
  }

  private fetchWeather(wp: RouteWaypoint): void {
    this.http.get<{ current: { temperature_2m: number; weather_code: number } }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${wp.lat}&longitude=${wp.lon}&current=temperature_2m,weather_code`
    ).subscribe({
      next: data => this.weather.set({
        temp: Math.round(data.current.temperature_2m),
        icon: this.getWeatherIcon(data.current.weather_code),
        city: wp.name,
      }),
      error: () => this.weather.set(null)
    });
  }

  private getWeatherIcon(code: number): string {
    if (code === 0)          return '☀️';
    if (code <= 2)           return '🌤️';
    if (code === 3)          return '☁️';
    if (code <= 48)          return '🌫️';
    if (code <= 55)          return '🌦️';
    if (code <= 65)          return '🌧️';
    if (code <= 77)          return '🌨️';
    if (code <= 82)          return '🌦️';
    if (code <= 86)          return '🌨️';
    return '⛈️';
  }
}
