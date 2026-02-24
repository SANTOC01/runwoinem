export interface RouteWaypoint {
  name: string;
  country: string;
  lat: number;
  lon: number;
  cumulativeKm: number;
  isMilestone: boolean;
  emoji?: string;
  /** SVG label offset from the dot (defaults: dx=8, dy=-12) */
  labelDx?: number;
  labelDy?: number;
  /** SVG text-anchor for the label (default: 'start') */
  labelAnchor?: 'start' | 'end' | 'middle';
  /** Filename in assets/images/locations/ (e.g. 'paris.png') */
  image?: string;
}

export const LAP_DISTANCE_KM = 15010;
export const TOTAL_GOAL_KM = 50000;

// Grand European Tour starting from Weinheim, BW
// One full lap ≈ 15,010 km
// The route closes back to Weinheim, enabling endless laps
export const EUROPE_ROUTE_WAYPOINTS: RouteWaypoint[] = [
  { name: 'Weinheim',   country: 'DE', lat: 49.545, lon:   8.665, cumulativeKm:     0, isMilestone: true,  emoji: '🏁', image: 'weinheim.png' },
  { name: 'Köln',       country: 'DE', lat: 50.938, lon:   6.960, cumulativeKm:   190, isMilestone: false, labelDx: -45, labelDy: 14, image: 'cologne.png' },
  { name: 'Paris',      country: 'FR', lat: 48.853, lon:   2.350, cumulativeKm:   690, isMilestone: true,  emoji: '🗼', labelDy: 18, image: 'paris.png' },
  { name: 'Madrid',     country: 'ES', lat: 40.416, lon:  -3.703, cumulativeKm:  1990, isMilestone: true,  emoji: '🐂', image: 'madrid.png' },
  { name: 'Lissabon',   country: 'PT', lat: 38.716, lon:  -9.139, cumulativeKm:  2630, isMilestone: true,  emoji: '🎯', image: 'lissabon.png' },
  { name: 'Marseille',  country: 'FR', lat: 43.297, lon:   5.381, cumulativeKm:  4530, isMilestone: false, labelDy: 18, image: 'marseille.png' },
  { name: 'Rom',        country: 'IT', lat: 41.890, lon:  12.492, cumulativeKm:  5230, isMilestone: true,  emoji: '🏛️', image: 'rome.png' },
  { name: 'Athen',      country: 'GR', lat: 37.984, lon:  23.728, cumulativeKm:  7330, isMilestone: true,  emoji: '🏺', image: 'athen.png' },
  { name: 'Budapest',   country: 'HU', lat: 47.498, lon:  19.040, cumulativeKm:  9030, isMilestone: false, labelDy: 16, image: 'budapest.png' },
  { name: 'Warschau',   country: 'PL', lat: 52.230, lon:  21.010, cumulativeKm:  9810, isMilestone: false, image: 'warschau.png' },
  { name: 'Helsinki',   country: 'FI', lat: 60.170, lon:  24.935, cumulativeKm: 11410, isMilestone: true,  emoji: '🌲', image: 'helsinki.png' },
  { name: 'Oslo',       country: 'NO', lat: 59.911, lon:  10.752, cumulativeKm: 12310, isMilestone: true,  emoji: '⛵', image: 'oslo.png' },
  { name: 'London',     country: 'GB', lat: 51.507, lon:  -0.128, cumulativeKm: 13910, isMilestone: true,  emoji: '🎡', labelDx: -12, labelDy: 4, labelAnchor: 'end', image: 'london.png' },
  { name: 'Amsterdam',  country: 'NL', lat: 52.370, lon:   4.895, cumulativeKm: 14410, isMilestone: false, image: 'amsterdam.png' },
];
