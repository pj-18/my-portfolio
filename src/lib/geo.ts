/**
 * The little geometry the tours need, shared by the build and the browser (no dependencies).
 * Coordinates are [longitude, latitude], the order maps and GeoJSON use.
 */
export type LngLat = [number, number];
export type Bounds = [LngLat, LngLat];

const R = 6371; // km
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversine([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance from the start of the path to each of its points, in km. */
export function measure(path: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + haversine(path[i - 1], path[i]));
  return out;
}

/** The point `d` km along the path, and the path drawn up to it. */
export function along(path: LngLat[], cum: number[], d: number): { at: LngLat; drawn: LngLat[]; index: number } {
  if (path.length === 0) return { at: [0, 0], drawn: [], index: 0 };
  const total = cum[cum.length - 1];
  if (d <= 0 || path.length === 1) return { at: path[0], drawn: [path[0]], index: 0 };
  if (d >= total) return { at: path[path.length - 1], drawn: path.slice(), index: path.length - 1 };
  // binary search for the segment that holds d
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo] || 1;
  const t = (d - cum[lo]) / span;
  const a = path[lo];
  const b = path[hi];
  const at: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { at, drawn: [...path.slice(0, lo + 1), at], index: lo };
}

/** Index of the path point closest to `point`, searching from `from` onwards. */
export function nearest(path: LngLat[], point: LngLat, from = 0): number {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < path.length; i++) {
    const d = haversine(path[i], point);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** South-west and north-east corners around all the points. */
export function bounds(points: LngLat[]): Bounds {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lng, lat] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  return [
    [w, s],
    [e, n],
  ];
}
