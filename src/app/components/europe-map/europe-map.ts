import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
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

const GERMAN_ORDINALS = ['', 'zweite', 'dritte', 'vierte', 'fünfte', 'sechste'];
const MILESTONE_RADIUS_KM = 300; // within this range we show the "X. Mal" message

@Component({
  selector: 'app-europe-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './europe-map.html',
  styleUrl: './europe-map.scss',
})
export class EuropeMap implements OnChanges {
  @Input() total = 0;

  readonly waypoints: RouteWaypoint[] = EUROPE_ROUTE_WAYPOINTS;
  readonly lapDistance = LAP_DISTANCE_KM;
  readonly totalGoal = TOTAL_GOAL_KM;
  readonly svgWidth = SVG_W;
  readonly svgHeight = SVG_H;
  // Cropped viewBox focused on the actual route area (lon≈-10..25, lat≈38..62)
  readonly routeViewBox = '175 158 565 420';

  // Precomputed SVG points and bezier segments (constant)
  readonly svgPoints: SvgPoint[] = EUROPE_ROUTE_WAYPOINTS.map(w => ({
    x: svgX(w.lon), y: svgY(w.lat),
  }));
  // Append start point again to close the loop
  private readonly loopPoints: SvgPoint[] = [...this.svgPoints, this.svgPoints[0]];
  private readonly segments: BezierSegment[] = buildSegments(this.svgPoints);

  // Full route path (all segments, loop closed) – drawn once as dashed grey
  readonly fullRoutePath: string = (() => {
    const allSegs = this.segments;
    let d = `M ${allSegs[0].p0.x.toFixed(1)},${allSegs[0].p0.y.toFixed(1)}`;
    for (const s of allSegs) {
      d += ` C ${s.cp1.x.toFixed(1)},${s.cp1.y.toFixed(1)} ${s.cp2.x.toFixed(1)},${s.cp2.y.toFixed(1)} ${s.p1.x.toFixed(1)},${s.p1.y.toFixed(1)}`;
    }
    // Close back to start
    d += ' Z';
    return d;
  })();

  // Dynamic state updated on each input change
  currentLap = 0;
  kmInLap = 0;
  dotX = this.svgPoints[0].x;
  dotY = this.svgPoints[0].y;
  progressPath = '';
  currentSegmentIndex = 0;
  nearestCityName = EUROPE_ROUTE_WAYPOINTS[0].name;
  lapMessage = '';
  nearMilestoneCity: RouteWaypoint | null = null;

  ngOnChanges(): void {
    this.updatePosition();
  }

  private updatePosition(): void {
    const total = Math.max(0, this.total);
    this.currentLap = Math.floor(total / LAP_DISTANCE_KM);
    this.kmInLap = total % LAP_DISTANCE_KM;

    const wps = EUROPE_ROUTE_WAYPOINTS;
    const lapKm = this.kmInLap;

    // Find which segment we are in
    let segIdx = wps.length - 1; // default: last segment (back to start)
    for (let i = 0; i < wps.length - 1; i++) {
      if (lapKm >= wps[i].cumulativeKm && lapKm < wps[i + 1].cumulativeKm) {
        segIdx = i;
        break;
      }
    }
    // Handle the closing segment (Amsterdam → Weinheim)
    const closingSegStart = wps[wps.length - 1].cumulativeKm;
    const closingSegEnd = LAP_DISTANCE_KM;
    let t: number;
    if (lapKm >= closingSegStart) {
      segIdx = wps.length - 1;
      t = (lapKm - closingSegStart) / (closingSegEnd - closingSegStart);
    } else {
      const segStart = wps[segIdx].cumulativeKm;
      const segEnd = wps[segIdx + 1].cumulativeKm;
      t = (lapKm - segStart) / (segEnd - segStart);
    }
    t = Math.max(0, Math.min(1, t));

    this.currentSegmentIndex = segIdx;

    // Dot position along bezier
    const dot = bezierAt(this.segments[segIdx], t);
    this.dotX = dot.x;
    this.dotY = dot.y;

    // Build progress path: all completed segments + de Casteljau split of partial segment
    if (segIdx === 0 && t === 0) {
      this.progressPath = '';
    } else {
      let d = `M ${this.segments[0].p0.x.toFixed(1)},${this.segments[0].p0.y.toFixed(1)}`;
      for (let i = 0; i < segIdx; i++) {
        d = appendSeg(d, this.segments[i]);
      }
      if (t > 0) {
        d = appendSeg(d, splitBezierFirst(this.segments[segIdx], t));
      }
      this.progressPath = d;
    }

    // Nearest city (the waypoint we most recently passed)
    this.nearestCityName = wps[segIdx].name;

    // Check for "X. Mal in Y" message – within MILESTONE_RADIUS_KM of a milestone city
    this.nearMilestoneCity = null;
    if (this.currentLap > 0) {
      for (const wp of wps) {
        if (!wp.isMilestone) continue;
        const dist = Math.abs(lapKm - wp.cumulativeKm);
        if (dist <= MILESTONE_RADIUS_KM) {
          this.nearMilestoneCity = wp;
          break;
        }
      }
    }

    this.lapMessage = this.buildLapMessage();
  }

  private buildLapMessage(): string {
    if (this.currentLap === 0 && !this.nearMilestoneCity) return '';

    if (this.nearMilestoneCity && this.currentLap > 0) {
      const lapNum = this.currentLap + 1;
      const ord = GERMAN_ORDINALS[this.currentLap] ?? `${lapNum}.`;
      return `Das ist schon das ${ord} Mal in ${this.nearMilestoneCity.name}! 🎉`;
    }

    if (this.currentLap > 0) {
      return `Runde ${this.currentLap + 1} läuft – weiter so! 💪`;
    }

    return '';
  }

  /** For the template: get SVG x for a waypoint */
  wpX(wp: RouteWaypoint): number { return svgX(wp.lon); }
  /** For the template: get SVG y for a waypoint */
  wpY(wp: RouteWaypoint): number { return svgY(wp.lat); }

  /** Whether a waypoint has already been passed in the current lap */
  isPassed(wp: RouteWaypoint): boolean {
    return this.kmInLap > wp.cumulativeKm;
  }

  get totalKmFormatted(): string {
    return this.total.toLocaleString('de-DE');
  }
}
