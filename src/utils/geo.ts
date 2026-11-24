export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Index at which to insert `point` into `stops` so the corridor detour is
 * smallest (cheapest insertion). Never before the origin or after the destination.
 */
export function cheapestInsertionIndex(stops: readonly LatLng[], point: LatLng): number {
  if (stops.length < 2) return stops.length;
  let best = stops.length - 1;
  let bestCost = Infinity;
  for (let i = 0; i < stops.length - 1; i++) {
    const cost =
      haversineMeters(stops[i], point) + haversineMeters(point, stops[i + 1]) - haversineMeters(stops[i], stops[i + 1]);
    if (cost < bestCost) {
      bestCost = cost;
      best = i + 1;
    }
  }
  return best;
}

/** Index of the coordinate in `line` closest to `point`, searching from `start`. */
export function nearestIndex(line: readonly LatLng[], point: LatLng, start = 0): number {
  let best = start;
  let bestDist = Infinity;
  for (let i = start; i < line.length; i++) {
    const d = haversineMeters(line[i], point);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Right-hand traffic offsets. Philippine roads drive on the right, so each
// direction's line and curbside geofences sit to the right of travel. That
// keeps the outbound and return trips side by side on shared roads.
// ---------------------------------------------------------------------------

type XY = { x: number; y: number };

const M_PER_DEG_LAT = 110_540;
const mPerDegLng = (lat: number) => 111_320 * Math.cos(rad(lat));

/** Unit normal to the right of travel along (dx, dy). `yDown` for screen/SVG coordinates. */
function rightNormal(dx: number, dy: number, yDown: boolean): XY {
  const len = Math.hypot(dx, dy) || 1;
  return yDown ? { x: -dy / len, y: dx / len } : { x: dy / len, y: -dx / len };
}

/** Shifts a planar polyline `distance` units to the right of travel (mitred joins, capped). */
export function offsetPlanar<T extends XY>(points: readonly T[], distance: number, yDown = false): XY[] {
  if (points.length < 2 || distance === 0) return points.map(({ x, y }) => ({ x, y }));
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const nIn = i > 0 ? rightNormal(p.x - prev.x, p.y - prev.y, yDown) : null;
    const nOut = i < points.length - 1 ? rightNormal(next.x - p.x, next.y - p.y, yDown) : null;
    const a = nIn ?? nOut!;
    const b = nOut ?? nIn!;
    const mx = a.x + b.x;
    const my = a.y + b.y;
    const mLen = Math.hypot(mx, my);
    if (mLen < 1e-6) return { x: p.x + a.x * distance, y: p.y + a.y * distance };
    // Miter length = distance / cos(half angle), capped so sharp turns do not spike.
    const cosHalf = Math.max(0.5, (mx * a.x + my * a.y) / mLen);
    const scale = distance / cosHalf / mLen;
    return { x: p.x + mx * scale, y: p.y + my * scale };
  });
}

/** Shifts a lat/lng path `meters` to the right of travel. */
export function offsetPath(path: readonly LatLng[], meters: number): LatLng[] {
  if (path.length < 2 || meters === 0) return [...path];
  const lat0 = path[0].lat;
  const lng0 = path[0].lng;
  const kx = mPerDegLng(lat0);
  const local = path.map((p) => ({ x: (p.lng - lng0) * kx, y: (p.lat - lat0) * M_PER_DEG_LAT }));
  return offsetPlanar(local, meters).map((p) => ({ lat: lat0 + p.y / M_PER_DEG_LAT, lng: lng0 + p.x / kx }));
}

/** Moves `point` `meters` to the right of the travel direction `from` → `to`. */
export function offsetPointRight(point: LatLng, from: LatLng, to: LatLng, meters: number): LatLng {
  const kx = mPerDegLng(point.lat);
  const n = rightNormal((to.lng - from.lng) * kx, (to.lat - from.lat) * M_PER_DEG_LAT, false);
  if (!Number.isFinite(n.x) || (from.lat === to.lat && from.lng === to.lng)) return point;
  return { lat: point.lat + (n.y * meters) / M_PER_DEG_LAT, lng: point.lng + (n.x * meters) / kx };
}

/** Ground metres per screen pixel at a Web Mercator zoom level. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156_543.033_92 * Math.cos(rad(lat))) / 2 ** zoom;
}
